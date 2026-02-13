import { createClient } from '@supabase/supabase-js'

// Replace these with your actual Supabase project credentials
const supabaseUrl = 'https://wlnhapuqcusoqvvrzvlc.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbmhhcHVxY3Vzb3F2dnJ6dmxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5Nzg3MTgsImV4cCI6MjA4NjU1NDcxOH0.4ZiZumHz6Bg_OYLxY-5upwlIRqparp9S28kdf51wzHA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
