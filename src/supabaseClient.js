import { createClient } from '@supabase/supabase-js'

// Prefer Vite environment variables for credentials.
// Create a `.env` file (see `.env.example`) and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
// Falls back to the existing hard-coded values for local dev when env vars are not present.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wlnhapuqcusoqvvrzvlc.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbmhhcHVxY3Vzb3F2dnJ6dmxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5Nzg3MTgsImV4cCI6MjA4NjU1NDcxOH0.4ZiZumHz6Bg_OYLxY-5upwlIRqparp9S28kdf51wzHA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
