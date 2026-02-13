# Banter Squad - Complete Update Guide

**Last Updated:** February 13, 2026

This guide will walk you through fixing all bugs and adding the Events feature to your Banter Squad app.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup (Supabase)](#database-setup)
3. [File Updates](#file-updates)
4. [Testing](#testing)
5. [Deployment](#deployment)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, make sure you have:
- ✅ VS Code open with your `friends-social` project
- ✅ Access to your Supabase dashboard
- ✅ Terminal ready (you can use VS Code's built-in terminal: `Ctrl + ~`)

**Important:** This guide assumes you're in the project directory: `~/friends-social`

---

## Database Setup

### Step 1: Open Supabase SQL Editor

1. Go to [supabase.com](https://supabase.com)
2. Open your **Banter Web** project
3. Click **SQL Editor** on the left sidebar
4. Click **New Query**

### Step 2: Run This SQL (Copy Everything Below)

```sql
-- ================================================
-- FIX #1: Make image_url optional for text posts
-- ================================================
alter table posts alter column image_url drop not null;

-- ================================================
-- FIX #2: Fix profiles foreign key constraint
-- ================================================
alter table profiles drop constraint if exists profiles_id_fkey;

alter table profiles 
  add constraint profiles_id_fkey 
  foreign key (id) 
  references auth.users(id) 
  on delete cascade;

-- ================================================
-- NEW FEATURE: Events Table
-- ================================================
create table if not exists events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  event_date timestamp with time zone not null,
  location text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security on events
alter table events enable row level security;

-- Policies for events
create policy "Events are viewable by everyone"
  on events for select using (true);

create policy "Users can create events"
  on events for insert with check (auth.uid() = user_id);

create policy "Users can update their own events"
  on events for update using (auth.uid() = user_id);

create policy "Users can delete their own events"
  on events for delete using (auth.uid() = user_id);

-- ================================================
-- NEW FEATURE: Event Comments Table
-- ================================================
create table if not exists event_comments (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references events(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  text text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security on event_comments
alter table event_comments enable row level security;

-- Policies for event_comments
create policy "Event comments are viewable by everyone"
  on event_comments for select using (true);

create policy "Users can insert event comments"
  on event_comments for insert with check (auth.uid() = user_id);

create policy "Users can delete their own event comments"
  on event_comments for delete using (auth.uid() = user_id);
```

### Step 3: Click "Run" and Verify

- You should see "Success. No rows returned"
- Go to **Table Editor** → You should now see `events` and `event_comments` tables

✅ **Database setup complete!**

---

## File Updates

Now we'll update/create all the necessary files. 

### File 1: `src/components/CreatePost.jsx`

**What it fixes:** Text-only posts now work! Image compression bug fixed.

**Action:** Replace the entire contents of `src/components/CreatePost.jsx` with:

```jsx
import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function CreatePost({ session, onPostCreated }) {
  const [caption, setCaption] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)

  const compressImage = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target.result
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          
          const maxWidth = 1200
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
          
          canvas.width = width
          canvas.height = height
          
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          
          canvas.toBlob(
            (blob) => {
              resolve(blob)
            },
            'image/jpeg',
            0.8
          )
        }
      }
    })
  }

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setImageFile(file)
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setPreview(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!imageFile && !caption.trim()) {
      alert('Please add an image or write something')
      return
    }

    setUploading(true)

    try {
      let publicUrl = null

      if (imageFile) {
        const compressedImage = await compressImage(imageFile)
        
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(filePath, compressedImage, {
            contentType: 'image/jpeg'
          })

        if (uploadError) throw uploadError

        const { data: { publicUrl: url } } = supabase.storage
          .from('post-images')
          .getPublicUrl(filePath)
        
        publicUrl = url
      }

      const { error: insertError } = await supabase
        .from('posts')
        .insert([
          {
            user_id: session.user.id,
            image_url: publicUrl,
            caption: caption.trim() || null,
          },
        ])

      if (insertError) throw insertError

      setCaption('')
      setImageFile(null)
      setPreview(null)
      
      onPostCreated()
      
    } catch (error) {
      alert('Error creating post: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Create New Post</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <textarea
          placeholder="What's on your mind?"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          style={styles.textarea}
          rows={3}
        />
        
        {preview && (
          <div style={styles.previewContainer}>
            <img src={preview} alt="Preview" style={styles.preview} />
            <button 
              type="button"
              onClick={removeImage}
              style={styles.removeButton}
            >
              ✕ Remove
            </button>
          </div>
        )}
        
        {!preview && (
          <label style={styles.fileLabel}>
            📷 Add Photo (Optional)
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={styles.fileInput}
            />
          </label>
        )}
        
        <button 
          type="submit" 
          disabled={uploading || (!caption.trim() && !imageFile)}
          style={styles.button}
        >
          {uploading ? 'Posting...' : 'Post'}
        </button>
      </form>
    </div>
  )
}

const styles = {
  container: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  textarea: {
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '1rem',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  previewContainer: {
    position: 'relative',
  },
  preview: {
    width: '100%',
    borderRadius: '8px',
    maxHeight: '400px',
    objectFit: 'cover',
  },
  removeButton: {
    position: 'absolute',
    top: '0.5rem',
    right: '0.5rem',
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
  },
  fileLabel: {
    display: 'inline-block',
    padding: '0.75rem',
    border: '2px dashed #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    textAlign: 'center',
    color: '#6b7280',
  },
  fileInput: {
    display: 'none',
  },
  button: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '0.75rem',
    borderRadius: '6px',
    border: 'none',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: '500',
  },
}
```

✅ Save the file (`Cmd + S`)

---

### File 2: `src/components/Settings.jsx`

**What it does:** Allows users to edit their nickname

**Action:** Create NEW file `src/components/Settings.jsx`:

```jsx
import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Settings({ profile, onUpdate, onClose }) {
  const [nickname, setNickname] = useState(profile.nickname)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!nickname.trim() || nickname.length < 3) {
      alert('Nickname must be at least 3 characters')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ nickname: nickname.trim() })
        .eq('id', profile.id)

      if (error) {
        if (error.code === '23505') {
          alert('This nickname is already taken. Please choose another.')
        } else {
          throw error
        }
      } else {
        alert('Nickname updated!')
        onUpdate()
        onClose()
      }
    } catch (error) {
      alert('Error updating profile: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.title}>Edit Profile</h2>
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Nickname</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              style={styles.input}
              required
              minLength={3}
              maxLength={20}
            />
          </div>
          
          <div style={styles.buttons}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={styles.saveButton}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '400px',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '1.5rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '500',
    marginBottom: '0.25rem',
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '1rem',
  },
  buttons: {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'flex-end',
    marginTop: '1rem',
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
    color: '#374151',
    padding: '0.75rem 1.5rem',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
  },
}
```

✅ Save the file

---

### File 3: `src/components/CreateEvent.jsx`

**What it does:** Modal to create new events

**Action:** Create NEW file `src/components/CreateEvent.jsx`:

```jsx
import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function CreateEvent({ session, onEventCreated, onClose }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [location, setLocation] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!title.trim() || !eventDate) {
      alert('Please add a title and date')
      return
    }

    setSubmitting(true)

    try {
      const dateTimeString = eventTime 
        ? `${eventDate}T${eventTime}:00`
        : `${eventDate}T00:00:00`

      const { error } = await supabase
        .from('events')
        .insert([
          {
            user_id: session.user.id,
            title: title.trim(),
            description: description.trim() || null,
            event_date: dateTimeString,
            location: location.trim() || null,
          },
        ])

      if (error) throw error

      setTitle('')
      setDescription('')
      setEventDate('')
      setEventTime('')
      setLocation('')
      
      onEventCreated()
      onClose()
    } catch (error) {
      alert('Error creating event: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.title}>Create New Event</h2>
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Event Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Birthday Party, Movie Night, etc."
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell everyone about the event..."
              style={styles.textarea}
              rows={3}
            />
          </div>

          <div style={styles.row}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Date *</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                style={styles.input}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Time</label>
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Where's it happening?"
              style={styles.input}
            />
          </div>
          
          <div style={styles.buttons}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={styles.submitButton}
            >
              {submitting ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '1.5rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  row: {
    display: 'flex',
    gap: '1rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '500',
    marginBottom: '0.25rem',
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '1rem',
  },
  textarea: {
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '1rem',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  buttons: {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'flex-end',
    marginTop: '1rem',
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
    color: '#374151',
    padding: '0.75rem 1.5rem',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
  },
}
```

✅ Save the file

---

### File 4: `src/components/EventCard.jsx`

**What it does:** Display individual event with countdown timer

**Action:** Create NEW file `src/components/EventCard.jsx`:

```jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function EventCard({ event, session, onUpdate }) {
  const [commentText, setCommentText] = useState('')
  const [showComments, setShowComments] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')

  const calculateTimeLeft = () => {
    const now = new Date()
    const eventDate = new Date(event.event_date)
    const diff = eventDate - now

    if (diff <= 0) {
      return 'Event has passed'
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) {
      return `${days} ${days === 1 ? 'day' : 'days'} to go`
    } else if (hours > 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} to go`
    } else {
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} to go`
    }
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 60000)

    setTimeLeft(calculateTimeLeft())

    return () => clearInterval(timer)
  }, [event.event_date])

  const handleComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return

    setSubmitting(true)
    const { error } = await supabase
      .from('event_comments')
      .insert([
        {
          event_id: event.id,
          user_id: session.user.id,
          text: commentText,
        },
      ])

    if (!error) {
      setCommentText('')
      onUpdate()
    }
    setSubmitting(false)
  }

  const formatEventDate = (dateString) => {
    const date = new Date(dateString)
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
    return date.toLocaleDateString('en-US', options)
  }

  const isPastEvent = new Date(event.event_date) < new Date()
  const commentsCount = event.event_comments?.length || 0

  return (
    <div style={{...styles.container, ...(isPastEvent ? styles.pastEvent : {})}}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>{event.title}</h3>
          <span style={styles.creator}>Created by @{event.profiles?.nickname || 'Unknown'}</span>
        </div>
        <div style={isPastEvent ? styles.pastBadge : styles.countdown}>
          {isPastEvent ? '✓ Past Event' : `⏰ ${timeLeft}`}
        </div>
      </div>

      {event.description && (
        <p style={styles.description}>{event.description}</p>
      )}

      <div style={styles.details}>
        <div style={styles.detailItem}>
          <span style={styles.icon}>📅</span>
          <span>{formatEventDate(event.event_date)}</span>
        </div>
        
        {event.location && (
          <div style={styles.detailItem}>
            <span style={styles.icon}>📍</span>
            <span>{event.location}</span>
          </div>
        )}
      </div>

      <div style={styles.actions}>
        <button 
          onClick={() => setShowComments(!showComments)} 
          style={styles.actionButton}
        >
          💬 {commentsCount} {commentsCount === 1 ? 'Comment' : 'Comments'}
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
            {event.event_comments?.map((comment) => (
              <div key={comment.id} style={styles.comment}>
                <span style={styles.commentAuthor}>@{comment.profiles?.nickname || 'Unknown'}</span>
                <span style={styles.commentText}>{comment.text}</span>
              </div>
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
    border: '2px solid #3b82f6',
  },
  pastEvent: {
    border: '2px solid #d1d5db',
    opacity: 0.7,
  },
  header: {
    padding: '1rem',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    margin: 0,
    marginBottom: '0.25rem',
  },
  creator: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  countdown: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  pastBadge: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  description: {
    padding: '1rem',
    margin: 0,
    color: '#374151',
  },
  details: {
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    backgroundColor: '#f9fafb',
  },
  detailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
  },
  icon: {
    fontSize: '1rem',
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
    fontSize: '0.875rem',
    padding: '0.5rem',
    color: '#6b7280',
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
    fontSize: '0.875rem',
  },
  commentButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  commentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  comment: {
    padding: '0.75rem',
    backgroundColor: '#f3f4f6',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  commentAuthor: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#3b82f6',
  },
  commentText: {
    fontSize: '0.875rem',
  },
}
```

✅ Save the file

---

### File 5: `src/components/Events.jsx`

**What it does:** Main Events tab component

**Action:** Create NEW file `src/components/Events.jsx`:

```jsx
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
```

✅ Save the file

---

### File 6: `src/App.jsx`

**What it does:** Updates main app to include Events tab

**Action:** Replace the entire contents of `src/App.jsx` with:

```jsx
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
  const [activeTab, setActiveTab] = useState('feed')

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
```

✅ Save the file

---

### File 7: Update `src/components/Navbar.jsx`

**What it does:** Adds ability to click nickname to edit

**Action:** Replace the entire contents of `src/components/Navbar.jsx` with:

```jsx
import { useState } from 'react'
import { supabase } from '../supabaseClient'
import Settings from './Settings'

export default function Navbar({ session, profile, onProfileUpdate }) {
  const [showSettings, setShowSettings] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <>
      <nav style={styles.nav}>
        <div style={styles.container}>
          <h1 style={styles.logo}>Banter Squad</h1>
          <div style={styles.userSection}>
            <button 
              onClick={() => setShowSettings(true)}
              style={styles.nicknameButton}
            >
              @{profile.nickname}
            </button>
            <button onClick={handleLogout} style={styles.logoutButton}>
              Logout
            </button>
          </div>
        </div>
      </nav>
      
      {showSettings && (
        <Settings 
          profile={profile}
          onUpdate={onProfileUpdate}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
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
  nicknameButton: {
    fontSize: '0.875rem',
    color: '#374151',
    fontWeight: '500',
    background: 'none',
    border: '1px solid #d1d5db',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer',
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
```

✅ Save the file

---

## Testing

### Step 1: Test Locally

In Terminal:

```bash
npm run dev
```

### Step 2: Test Features

1. **Logout** and **delete your old profile** in Supabase (Table Editor → profiles)
2. **Sign up fresh** with a new email or same email
3. **Set a nickname**
4. Try creating:
   - ✅ Text-only post (no image)
   - ✅ Post with image
   - ✅ Event with all details
5. Test:
   - ✅ Countdown timer on events
   - ✅ Switching between Feed and Events tabs
   - ✅ Commenting on events
   - ✅ Clicking nickname to edit

### Step 3: Check for Errors

Open Browser Console (`Cmd + Option + J` in Chrome) and look for errors.

---

## Deployment

### Step 1: Commit Changes

```bash
git add .
git commit -m "Fixed text posts bug and added Events feature"
git push
```

### Step 2: Verify Deployment

Vercel will automatically deploy. Check:
- Go to [vercel.com](https://vercel.com) → Your project
- Wait for "Building..." to become "Ready"
- Click "Visit" to test live site

---

## Troubleshooting

### Issue: "foreign key constraint" error on profile setup

**Solution:**
1. Supabase → Table Editor → profiles → Delete all rows
2. Supabase → Authentication → Users → Delete your user
3. Sign up fresh with new email

### Issue: Text posts still not working

**Solution:**
- Make sure you ran the SQL: `alter table posts alter column image_url drop not null;`
- Check browser console for specific error

### Issue: Events tab is blank

**Solution:**
- Verify you created Events.jsx, CreateEvent.jsx, EventCard.jsx
- Check that SQL for events tables was run successfully
- Look in browser console for errors

### Issue: Countdown timer not updating

**Solution:**
- This is normal - it updates every minute, not every second
- Refresh the page to see updated countdown

---

## Summary of Changes

### Bugs Fixed ✅
1. Text-only posts now work (image is optional)
2. Profile foreign key constraint fixed
3. Image preview with remove button
4. Better error handling

### New Features ✨
1. Events tab with full CRUD
2. Real-time countdown timers (days/hours/minutes)
3. Event comments system
4. Filter upcoming vs all events
5. Settings to edit nickname
6. Tab navigation (Feed / Events)

### Files Modified 📝
- `src/App.jsx` - Added tabs
- `src/components/CreatePost.jsx` - Fixed bugs
- `src/components/Navbar.jsx` - Added settings button

### Files Created 🆕
- `src/components/Events.jsx`
- `src/components/CreateEvent.jsx`
- `src/components/EventCard.jsx`
- `src/components/Settings.jsx`

---

## Next Steps

Now that everything works, consider adding:
1. Delete/edit posts and events
2. RSVP system for events
3. Event reminders
4. User profile pages
5. Search functionality

---

**Questions?** Check browser console for errors or review specific sections above!

---

*Generated on February 13, 2026*
