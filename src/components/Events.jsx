import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import CreateEvent from './CreateEvent'
import EventCard from './EventCard'

export default function Events({ session }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [filter, setFilter] = useState('upcoming') // 'upcoming' or 'all'

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          profiles:user_id (nickname),
          event_comments (
            id,
            text,
            user_id,
            created_at,
            profiles:user_id (nickname)
          )
        `)
        .order('event_date', { ascending: true })

      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('Error fetching events:', error)
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
