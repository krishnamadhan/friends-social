import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import CreatePost from './CreatePost'
import Post from './Post'

export default function Feed({ session }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (nickname),
          comments (
            id, 
            text, 
            user_id, 
            created_at,
            parent_comment_id,
            profiles:user_id (nickname)
          ),
          likes (id, user_id)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPosts(data || [])
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  return (
    <div style={styles.container}>
      <CreatePost session={session} onPostCreated={fetchPosts} />
      
      <div style={styles.postsContainer}>
        {loading ? (
          <div style={styles.loading}>Loading posts...</div>
        ) : posts.length === 0 ? (
          <div style={styles.noPosts}>
            No posts yet. Be the first to share something!
          </div>
        ) : (
          posts.map((post) => (
            <Post 
              key={post.id} 
              post={post} 
              session={session}
              onUpdate={fetchPosts}
            />
          ))
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '2rem 1rem',
  },
  postsContainer: {
    marginTop: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  loading: {
    textAlign: 'center',
    color: '#6b7280',
  },
  noPosts: {
    textAlign: 'center',
    color: '#6b7280',
    padding: '2rem',
  },
}