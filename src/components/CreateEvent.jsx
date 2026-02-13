import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function CreateEvent({ session, onEventCreated, onClose }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [location, setLocation] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!title.trim() || !eventDate) {
      alert('Please add a title and date')
      return
    }

    setSubmitting(true)

    try {
      // Combine date and time
      const dateTimeString = eventTime 
        ? `${eventDate}T${eventTime}:00`
        : `${eventDate}T00:00:00`

      const { error } = await supabase
        .from('events')
        .insert([
          {
            user_id: session.user.id,
            title: title.trim(),
            description: description.trim() || null,
            event_date: dateTimeString,
            location: location.trim() || null,
          },
        ])

      if (error) throw error

      // Reset form
      setTitle('')
      setDescription('')
      setEventDate('')
      setEventTime('')
      setLocation('')
      
      onEventCreated()
      onClose()
    } catch (error) {
      alert('Error creating event: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.title}>Create New Event</h2>
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Event Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Birthday Party, Movie Night, etc."
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell everyone about the event..."
              style={styles.textarea}
              rows={3}
            />
          </div>

          <div style={styles.row}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Date *</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                style={styles.input}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Time</label>
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Where's it happening?"
              style={styles.input}
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
              disabled={submitting}
              style={styles.submitButton}
            >
              {submitting ? 'Creating...' : 'Create Event'}
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
    maxWidth: '500px',
    maxHeight: '90vh',
    overflowY: 'auto',
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
    flex: 1,
  },
  row: {
    display: 'flex',
    gap: '1rem',
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
  textarea: {
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '1rem',
    fontFamily: 'inherit',
    resize: 'vertical',
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
  submitButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
  },
}
