import { supabase } from '../supabaseClient'

export default function Navbar({ session, profile }) {
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <nav style={styles.nav}>
      <div style={styles.container}>
        <h1 style={styles.logo}>Banter Squad</h1>
        <div style={styles.userSection}>
          <span style={styles.nickname}>@{profile.nickname}</span>
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
  nickname: {
    fontSize: '0.875rem',
    color: '#374151',
    fontWeight: '500',
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