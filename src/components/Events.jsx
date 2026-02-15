import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import CreateEvent from './CreateEvent'
import EventCard from './EventCard'

export default function Events({ session }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [filter, setFilter] = useState('upcoming')

  const fetchEvents = async () => {
    setLoading(true)
    try {
      // First fetch events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true })

      if (eventsError) throw eventsError

      // Then fetch profiles separately
      const userIds = [...new Set(eventsData.map(e => e.user_id))]
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nickname')
        .in('id', userIds)

      if (profilesError) throw profilesError

      // Create a map of profiles
      const profilesMap = {}
      profilesData.forEach(profile => {
        profilesMap[profile.id] = profile
      })

      // Fetch event comments
      const eventIds = eventsData.map(e => e.id)
      let commentsData = []
      let commentsProfilesData = []

      if (eventIds.length > 0) {
        const { data: comments, error: commentsError } = await supabase
          .from('event_comments')
          .select('*')
          .in('event_id', eventIds)
          .order('created_at', { ascending: true })

        if (commentsError) throw commentsError
        commentsData = comments || []

        // Fetch profiles for comments
        const commentUserIds = [...new Set(commentsData.map(c => c.user_id))]
        if (commentUserIds.length > 0) {
          const { data: commentProfiles, error: commentProfilesError } = await supabase
            .from('profiles')
            .select('id, nickname')
            .in('id', commentUserIds)

          if (commentProfilesError) throw commentProfilesError
          commentsProfilesData = commentProfiles || []
        }
      }

      // Create comments profiles map
      const commentsProfilesMap = {}
      commentsProfilesData.forEach(profile => {
        commentsProfilesMap[profile.id] = profile
      })

      // Combine everything
      const eventsWithData = eventsData.map(event => ({
        ...event,
        profiles: profilesMap[event.user_id] || { nickname: 'Unknown' },
        event_comments: commentsData
          .filter(c => c.event_id === event.id)
          .map(comment => ({
            ...comment,
            profiles: commentsProfilesMap[comment.user_id] || { nickname: 'Unknown' }
          }))
      }))

      setEvents(eventsWithData)
    } catch (error) {
      console.error('Error fetching events:', error)
      alert('Error loading events: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const upcomingEvents = events.filter(event => new Date(event.event_date) >= new Date())
  const pastEvents = events.filter(event => new Date(event.event_date) < new Date())
  
  const displayedEvents = filter === 'upcoming' ? upcomingEvents : events

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Events</h2>
        <button 
          onClick={() => setShowCreateEvent(true)}
          style={styles.createButton}
        >
          + Create Event
        </button>
      </div>

      <div style={styles.filterBar}>
        <button
          onClick={() => setFilter('upcoming')}
          style={filter === 'upcoming' ? styles.filterButtonActive : styles.filterButton}
        >
          Upcoming ({upcomingEvents.length})
        </button>
        <button
          onClick={() => setFilter('all')}
          style={filter === 'all' ? styles.filterButtonActive : styles.filterButton}
        >
          All Events ({events.length})
        </button>
      </div>

      <div style={styles.eventsContainer}>
        {loading ? (
          <div style={styles.loading}>Loading events...</div>
        ) : displayedEvents.length === 0 ? (
          <div style={styles.noEvents}>
            {filter === 'upcoming' 
              ? 'No upcoming events. Create one to get started!'
              : 'No events yet. Be the first to create one!'}
          </div>
        ) : (
          displayedEvents.map((event) => (
            <EventCard 
              key={event.id} 
              event={event} 
              session={session}
              onUpdate={fetchEvents}
            />
          ))
        )}
      </div>

      {showCreateEvent && (
        <CreateEvent
          session={session}
          onEventCreated={fetchEvents}
          onClose={() => setShowCreateEvent(false)}
        />
      )}
    </div>
  )
}

const styles = {
  container: {
    maxWidth: '700px',
    margin: '0 auto',
    padding: '2rem 1rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    margin: 0,
  },
  createButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '6px',
    border: 'none',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: '500',
  },
  filterBar: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.5rem',
    backgroundColor: '#f3f4f6',
    padding: '0.25rem',
    borderRadius: '8px',
  },
  filterButton: {
    flex: 1,
    backgroundColor: 'transparent',
    color: '#6b7280',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '500',
  },
  filterButtonActive: {
    flex: 1,
    backgroundColor: 'white',
    color: '#3b82f6',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '600',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  eventsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  loading: {
    textAlign: 'center',
    color: '#6b7280',
    padding: '3rem',
  },
  noEvents: {
    textAlign: 'center',
    color: '#6b7280',
    padding: '3rem',
    backgroundColor: 'white',
    borderRadius: '8px',
  },
}