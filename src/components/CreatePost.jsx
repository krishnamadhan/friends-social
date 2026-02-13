import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function CreatePost({ session, onPostCreated }) {
  const [caption, setCaption] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)

  const compressImage = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target.result
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          
          // Resize if too large (max 1200px width)
          const maxWidth = 1200
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
          
          canvas.width = width
          canvas.height = height
          
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          
          // Convert to blob with compression (0.8 quality)
          canvas.toBlob(
            (blob) => {
              resolve(blob)
            },
            'image/jpeg',
            0.8
          )
        }
      }
    })
  }

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setImageFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setPreview(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Allow posting without image if caption exists
    if (!imageFile && !caption.trim()) {
      alert('Please add an image or write something')
      return
    }

    setUploading(true)

    try {
      let publicUrl = null

      // Upload image only if one was selected
      if (imageFile) {
        // Compress the image
        const compressedImage = await compressImage(imageFile)
        
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(filePath, compressedImage, {
            contentType: 'image/jpeg'
          })

        if (uploadError) throw uploadError

        // Get public URL
        const { data: { publicUrl: url } } = supabase.storage
          .from('post-images')
          .getPublicUrl(filePath)
        
        publicUrl = url
      }

      // Create post in database
      const { error: insertError } = await supabase
        .from('posts')
        .insert([
          {
            user_id: session.user.id,
            image_url: publicUrl,
            caption: caption.trim() || null,
          },
        ])

      if (insertError) throw insertError

      // Reset form
      setCaption('')
      setImageFile(null)
      setPreview(null)
      
      // Refresh posts
      onPostCreated()
      
    } catch (error) {
      alert('Error creating post: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Create New Post</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <textarea
          placeholder="What's on your mind?"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          style={styles.textarea}
          rows={3}
        />
        
        {preview && (
          <div style={styles.previewContainer}>
            <img src={preview} alt="Preview" style={styles.preview} />
            <button 
              type="button"
              onClick={removeImage}
              style={styles.removeButton}
            >
              ✕ Remove
            </button>
          </div>
        )}
        
        {!preview && (
          <label style={styles.fileLabel}>
            📷 Add Photo (Optional)
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={styles.fileInput}
            />
          </label>
        )}
        
        <button 
          type="submit" 
          disabled={uploading || (!caption.trim() && !imageFile)}
          style={styles.button}
        >
          {uploading ? 'Posting...' : 'Post'}
        </button>
      </form>
    </div>
  )
}

const styles = {
  container: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  textarea: {
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '1rem',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  previewContainer: {
    position: 'relative',
  },
  preview: {
    width: '100%',
    borderRadius: '8px',
    maxHeight: '400px',
    objectFit: 'cover',
  },
  removeButton: {
    position: 'absolute',
    top: '0.5rem',
    right: '0.5rem',
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
  },
  fileLabel: {
    display: 'inline-block',
    padding: '0.75rem',
    border: '2px dashed #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    textAlign: 'center',
    color: '#6b7280',
  },
  fileInput: {
    display: 'none',
  },
  button: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '0.75rem',
    borderRadius: '6px',
    border: 'none',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: '500',
    opacity: 1,
  },
}
