import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function EventCard({ event, session, onUpdate }) {
  const [commentText, setCommentText] = useState('')
  const [showComments, setShowComments] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')

  const calculateTimeLeft = () => {
    const now = new Date()
    const eventDate = new Date(event.event_date)
    const diff = eventDate - now

    if (diff <= 0) {
      return 'Event has passed'
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) {
      return `${days} ${days === 1 ? 'day' : 'days'} to go`
    } else if (hours > 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} to go`
    } else {
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} to go`
    }
  }

  useEffect(() => {
    // Update countdown every minute
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 60000)

    setTimeLeft(calculateTimeLeft())

    return () => clearInterval(timer)
  }, [event.event_date])

  const handleComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return

    setSubmitting(true)
    const { error } = await supabase
      .from('event_comments')
      .insert([
        {
          event_id: event.id,
          user_id: session.user.id,
          text: commentText,
        },
      ])

    if (!error) {
      setCommentText('')
      onUpdate()
    }
    setSubmitting(false)
  }

  const formatEventDate = (dateString) => {
    const date = new Date(dateString)
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
    return date.toLocaleDateString('en-US', options)
  }

  const isPastEvent = new Date(event.event_date) < new Date()
  const commentsCount = event.event_comments?.length || 0

  return (
    <div style={{...styles.container, ...(isPastEvent ? styles.pastEvent : {})}}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>{event.title}</h3>
          <span style={styles.creator}>Created by @{event.profiles?.nickname || 'Unknown'}</span>
        </div>
        <div style={isPastEvent ? styles.pastBadge : styles.countdown}>
          {isPastEvent ? '✓ Past Event' : `⏰ ${timeLeft}`}
        </div>
      </div>

      {event.description && (
        <p style={styles.description}>{event.description}</p>
      )}

      <div style={styles.details}>
        <div style={styles.detailItem}>
          <span style={styles.icon}>📅</span>
          <span>{formatEventDate(event.event_date)}</span>
        </div>
        
        {event.location && (
          <div style={styles.detailItem}>
            <span style={styles.icon}>📍</span>
            <span>{event.location}</span>
          </div>
        )}
      </div>

      <div style={styles.actions}>
        <button 
          onClick={() => setShowComments(!showComments)} 
          style={styles.actionButton}
        >
          💬 {commentsCount} {commentsCount === 1 ? 'Comment' : 'Comments'}
        </button>
      </div>

      {showComments && (
        <div style={styles.commentsSection}>
          <form onSubmit={handleComment} style={styles.commentForm}>
            <input
              type="text"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              style={styles.commentInput}
            />
            <button 
              type="submit" 
              disabled={submitting}
              style={styles.commentButton}
            >
              Post
            </button>
          </form>

          <div style={styles.commentsList}>
            {event.event_comments?.map((comment) => (
              <div key={comment.id} style={styles.comment}>
                <span style={styles.commentAuthor}>@{comment.profiles?.nickname || 'Unknown'}</span>
                <span style={styles.commentText}>{comment.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    border: '2px solid #3b82f6',
  },
  pastEvent: {
    border: '2px solid #d1d5db',
    opacity: 0.7,
  },
  header: {
    padding: '1rem',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    margin: 0,
    marginBottom: '0.25rem',
  },
  creator: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  countdown: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  pastBadge: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  description: {
    padding: '1rem',
    margin: 0,
    color: '#374151',
  },
  details: {
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    backgroundColor: '#f9fafb',
  },
  detailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
  },
  icon: {
    fontSize: '1rem',
  },
  actions: {
    padding: '0.5rem 1rem',
    display: 'flex',
    gap: '1rem',
    borderTop: '1px solid #e5e7eb',
  },
  actionButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.875rem',
    padding: '0.5rem',
    color: '#6b7280',
  },
  commentsSection: {
    padding: '1rem',
    borderTop: '1px solid #e5e7eb',
  },
  commentForm: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  commentInput: {
    flex: 1,
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
  },
  commentButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  commentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  comment: {
    padding: '0.75rem',
    backgroundColor: '#f3f4f6',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  commentAuthor: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#3b82f6',
  },
  commentText: {
    fontSize: '0.875rem',
  },
}
