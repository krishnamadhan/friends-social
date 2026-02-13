import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Settings({ profile, onUpdate, onClose }) {
  const [nickname, setNickname] = useState(profile.nickname)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!nickname.trim() || nickname.length < 3) {
      alert('Nickname must be at least 3 characters')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ nickname: nickname.trim() })
        .eq('id', profile.id)

      if (error) {
        if (error.code === '23505') {
          alert('This nickname is already taken. Please choose another.')
        } else {
          throw error
        }
      } else {
        alert('Nickname updated!')
        onUpdate()
        onClose()
      }
    } catch (error) {
      alert('Error updating profile: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.title}>Edit Profile</h2>
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Nickname</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              style={styles.input}
              required
              minLength={3}
              maxLength={20}
            />
          </div>
          
          <div style={styles.buttons}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={styles.saveButton}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '400px',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '1.5rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '500',
    marginBottom: '0.25rem',
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '1rem',
  },
  buttons: {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'flex-end',
    marginTop: '1rem',
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
    color: '#374151',
    padding: '0.75rem 1.5rem',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
  },
}