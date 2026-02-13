import { useState } from 'react'
import { supabase } from '../supabaseClient'

function Comment({ comment, postId, session, onUpdate, level = 0 }) {
  const [replyText, setReplyText] = useState('')
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleReply = async (e) => {
    e.preventDefault()
    if (!replyText.trim()) return

    setSubmitting(true)
    const { error } = await supabase
      .from('comments')
      .insert([
        {
          post_id: postId,
          user_id: session.user.id,
          text: replyText,
          parent_comment_id: comment.id,
        },
      ])

    if (!error) {
      setReplyText('')
      setShowReplyForm(false)
      onUpdate()
    }
    setSubmitting(false)
  }

  // Get replies to this comment
  const replies = comment.replies || []

  return (
    <div style={{ ...styles.comment, marginLeft: level > 0 ? '1.5rem' : '0' }}>
      <div style={styles.commentHeader}>
        <span style={styles.commentAuthor}>@{comment.profiles?.nickname || 'Unknown'}</span>
        <button 
          onClick={() => setShowReplyForm(!showReplyForm)}
          style={styles.replyButton}
        >
          Reply
        </button>
      </div>
      <span style={styles.commentText}>{comment.text}</span>
      
      {showReplyForm && (
        <form onSubmit={handleReply} style={styles.replyForm}>
          <input
            type="text"
            placeholder="Write a reply..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            style={styles.replyInput}
            autoFocus
          />
          <div style={styles.replyActions}>
            <button 
              type="button"
              onClick={() => {
                setShowReplyForm(false)
                setReplyText('')
              }}
              style={styles.cancelButton}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={submitting}
              style={styles.replySubmitButton}
            >
              {submitting ? 'Posting...' : 'Reply'}
            </button>
          </div>
        </form>
      )}

      {/* Render nested replies */}
      {replies.length > 0 && (
        <div style={styles.repliesContainer}>
          {replies.map((reply) => (
            <Comment
              key={reply.id}
              comment={reply}
              postId={postId}
              session={session}
              onUpdate={onUpdate}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Post({ post, session, onUpdate }) {
  const [commentText, setCommentText] = useState('')
  const [showComments, setShowComments] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const isLiked = post.likes?.some(like => like.user_id === session.user.id)
  const likesCount = post.likes?.length || 0
  
  // Count total comments including replies
  const countComments = (comments) => {
    let count = comments.length
    comments.forEach(comment => {
      if (comment.replies) {
        count += countComments(comment.replies)
      }
    })
    return count
  }
  
  // Only get top-level comments (no parent)
  const topLevelComments = post.comments?.filter(c => !c.parent_comment_id) || []
  const commentsCount = countComments(topLevelComments)

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
          parent_comment_id: null, // Top-level comment
        },
      ])

    if (!error) {
      setCommentText('')
      onUpdate()
    }
    setSubmitting(false)
  }

  // Build comment tree
  const buildCommentTree = (comments) => {
    const commentMap = {}
    const rootComments = []

    // First pass: create a map of all comments
    comments.forEach(comment => {
      commentMap[comment.id] = { ...comment, replies: [] }
    })

    // Second pass: build the tree
    comments.forEach(comment => {
      if (comment.parent_comment_id && commentMap[comment.parent_comment_id]) {
        commentMap[comment.parent_comment_id].replies.push(commentMap[comment.id])
      } else {
        rootComments.push(commentMap[comment.id])
      }
    })

    return rootComments
  }

  const commentTree = buildCommentTree(post.comments || [])

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.nickname}>@{post.profiles?.nickname || 'Unknown'}</span>
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
            {commentTree.map((comment) => (
              <Comment
                key={comment.id}
                comment={comment}
                postId={post.id}
                session={session}
                onUpdate={onUpdate}
              />
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
  nickname: {
    fontWeight: '600',
    fontSize: '0.875rem',
    color: '#3b82f6',
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
    gap: '0.75rem',
  },
  comment: {
    padding: '0.75rem',
    backgroundColor: '#f3f4f6',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  commentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentAuthor: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#3b82f6',
  },
  commentText: {
    fontSize: '0.875rem',
  },
  replyButton: {
    background: 'none',
    border: 'none',
    color: '#6b7280',
    fontSize: '0.75rem',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
  },
  replyForm: {
    marginTop: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  replyInput: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
  },
  replyActions: {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
    color: '#374151',
    border: 'none',
    padding: '0.375rem 0.75rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  replySubmitButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '0.375rem 0.75rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  repliesContainer: {
    marginTop: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
}