import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import CreatePost from './CreatePost'
import Post from './Post'

export default function Feed({ session }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchPosts = async () => {
    try {
      // Fetch posts directly without relationship join
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })

      if (postsError) throw postsError

      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')

      if (profilesError) throw profilesError

      // Build a profile map
      const profileMap = {}
      profilesData?.forEach(profile => {
        profileMap[profile.id] = profile
      })

      // Fetch all comments with their profiles
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')

      if (commentsError) throw commentsError

      // Fetch all likes
      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select('*')

      if (likesError) throw likesError

      // Enrich posts with related data
      const enrichedPosts = postsData?.map(post => ({
        ...post,
        profiles: profileMap[post.user_id],
        comments: commentsData?.filter(c => c.post_id === post.id).map(c => ({
          ...c,
          profiles: profileMap[c.user_id]
        })) || [],
        likes: likesData?.filter(l => l.post_id === post.id) || []
      })) || []

      setPosts(enrichedPosts)
    } catch (error) {
      console.error('Error fetching posts:', error)
      alert(`Failed to load posts: ${error.message}`)
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