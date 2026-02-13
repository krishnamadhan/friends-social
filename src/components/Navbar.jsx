import { supabase } from '../supabaseClient'

export default function Navbar({ session }) {
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <nav style={styles.nav}>
      <div style={styles.container}>
        <h1 style={styles.logo}>Friends Social</h1>
        <div style={styles.userSection}>
          <span style={styles.email}>{session.user.email}</span>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}

const styles = {
  nav: {
    backgroundColor: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    padding: '1rem',
  },
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#3b82f6',
    margin: 0,
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  email: {
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
  },
}