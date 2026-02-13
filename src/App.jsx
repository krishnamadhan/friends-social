import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Auth from './components/Auth'
import ProfileSetup from './components/ProfileSetup'
import Navbar from './components/Navbar'
import Feed from './components/Feed'
import Events from './components/Events'

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('feed') // 'feed' or 'events'

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchProfile(session.user.id)
      }
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '1.25rem' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {!session ? (
        <Auth />
      ) : !profile ? (
        <ProfileSetup session={session} onProfileCreated={() => fetchProfile(session.user.id)} />
      ) : (
        <>
          <Navbar 
            session={session} 
            profile={profile}
            onProfileUpdate={() => fetchProfile(session.user.id)}
          />
          
          <div style={styles.tabsContainer}>
            <button
              onClick={() => setActiveTab('feed')}
              style={activeTab === 'feed' ? styles.tabActive : styles.tab}
            >
              🏠 Feed
            </button>
            <button
              onClick={() => setActiveTab('events')}
              style={activeTab === 'events' ? styles.tabActive : styles.tab}
            >
              📅 Events
            </button>
          </div>

          {activeTab === 'feed' ? (
            <Feed session={session} />
          ) : (
            <Events session={session} />
          )}
        </>
      )}
    </div>
  )
}

const styles = {
  tabsContainer: {
    backgroundColor: 'white',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.5rem',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  tab: {
    backgroundColor: 'transparent',
    color: '#6b7280',
    padding: '0.75rem 2rem',
    border: 'none',
    borderBottom: '2px solid transparent',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: '500',
  },
  tabActive: {
    backgroundColor: 'transparent',
    color: '#3b82f6',
    padding: '0.75rem 2rem',
    border: 'none',
    borderBottom: '2px solid #3b82f6',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: '600',
  },
}

export default App
