import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function CreatePost({ session, onPostCreated }) {
  const [caption, setCaption] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!imageFile) {
      alert('Please select an image')
      return
    }

    setUploading(true)

    try {
      // Upload image to Supabase storage
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(filePath, imageFile)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(filePath)

      // Create post in database
      const { error: insertError } = await supabase
        .from('posts')
        .insert([
          {
            user_id: session.user.id,
            image_url: publicUrl,
            caption: caption || null,
          },
        ])

      if (insertError) throw insertError

      // Reset form
      setCaption('')
      setImageFile(null)
      e.target.reset()
      
      // Refresh posts
      onPostCreated()
      
      alert('Post created successfully!')
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
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          style={styles.fileInput}
          required
        />
        
        <textarea
          placeholder="Write a caption..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          style={styles.textarea}
          rows={3}
        />
        
        <button 
          type="submit" 
          disabled={uploading}
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
  fileInput: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
  },
  textarea: {
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '1rem',
    fontFamily: 'inherit',
    resize: 'vertical',
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
  },
}