import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Post({ post, session, onUpdate }) {
  const [commentText, setCommentText] = useState('')
  const [showComments, setShowComments] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const isLiked = post.likes?.some(like => like.user_id === session.user.id)
  const likesCount = post.likes?.length || 0
  const commentsCount = post.comments?.length || 0

  const handleLike = async () => {
    if (isLiked) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', session.user.id)
      
      if (!error) onUpdate()
    } else {
      const { error } = await supabase
        .from('likes')
        .insert([{ post_id: post.id, user_id: session.user.id }])
      
      if (!error) onUpdate()
    }
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return

    setSubmitting(true)
    const { error } = await supabase
      .from('comments')
      .insert([
        {
          post_id: post.id,
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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.email}>{session.user.email}</span>
        <span style={styles.date}>
          {new Date(post.created_at).toLocaleDateString()}
        </span>
      </div>

      {post.image_url && (
        <img src={post.image_url} alt="Post" style={styles.image} />
      )}

      {post.caption && (
        <p style={post.image_url ? styles.caption : styles.textOnlyPost}>
          {post.caption}
        </p>
      )}

      <div style={styles.actions}>
        <button onClick={handleLike} style={styles.actionButton}>
          {isLiked ? '❤️' : '🤍'} {likesCount}
        </button>
        <button 
          onClick={() => setShowComments(!showComments)} 
          style={styles.actionButton}
        >
          💬 {commentsCount}
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
            {post.comments?.map((comment) => (
              <div key={comment.id} style={styles.comment}>
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
  },
  header: {
    padding: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e5e7eb',
  },
  email: {
    fontWeight: '600',
    fontSize: '0.875rem',
  },
  date: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  image: {
    width: '100%',
    display: 'block',
  },
  caption: {
    padding: '1rem',
    margin: 0,
  },
  textOnlyPost: {
    padding: '2rem 1rem',
    margin: 0,
    fontSize: '1.125rem',
    lineHeight: '1.75',
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
    fontSize: '1rem',
    padding: '0.5rem',
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
  },
  commentButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  commentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  comment: {
    padding: '0.5rem',
    backgroundColor: '#f3f4f6',
    borderRadius: '6px',
  },
  commentText: {
    fontSize: '0.875rem',
  },
}