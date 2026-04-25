# STUCO Website - Supabase Integration Guide

## 📋 Overview

Your Student Council website now has full Supabase integration! This allows you to:
- ✏️ Manage announcements, events, and initiatives from an admin panel
- 📊 View form submissions and survey responses
- 🔐 Secure admin login
- 📱 Real-time data updates on the public website

---

## 🚀 Quick Start

### Step 1: Create a Supabase Project

1. Go to **[supabase.com](https://supabase.com)**
2. Click **"Start your project"** and sign up
3. Create a new project
4. Note your:
   - **Project URL** (something like `https://xxxx.supabase.co`)
   - **Anon Public Key** (found under Settings → API)

### Step 2: Set Up Database Tables

1. In Supabase, go to **SQL Editor**
2. Copy and paste all SQL commands from `SUPABASE_SETUP.md`
3. Run each command to create the tables

### Step 3: Update config.js

Open `config.js` in your project and replace:

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-public-key';
```

**Note:** Get these values from your Supabase project settings.

### Step 4: Access Your Admin Panel

Visit: **`yourdomain.com/admin`** (or `file:///path/to/admin.html` locally)

**Default Login:**
- Username: `admin`
- Password: `admin123`

⚠️ **Change the default password in production!** Update the login check in `admin.html`.

---

## 📁 File Structure

```
stuco website/
├── index.html              # Main website (fetches data from Supabase)
├── admin.html              # Admin panel (manage all content)
├── config.js               # Supabase configuration
├── SUPABASE_SETUP.md       # Database setup instructions
└── README.md               # This file
```

---

## 🛠️ Features

### Public Website (index.html)

- **Announcements Section** - Displays latest announcements from database
- **Events Section** - Shows featured event + upcoming events list
- **Initiatives Section** - Displays active initiatives with progress bars
- **Contact Form** - Saves submissions to `contact_submissions` table

### Admin Panel (admin.html)

**Manage:**
1. **📰 Announcements** - Create, edit, delete news items
2. **📅 Events** - Add/edit events (with featured event option)
3. **🎯 Initiatives** - Manage initiatives and progress tracking
4. **📝 Registrations** - View all event registrations
5. **📧 Contact Submissions** - View and manage contact form submissions
6. **📊 Survey Responses** - Track survey responses

---

## 📊 Database Schema

### Announcements
```
- id (Primary Key)
- title
- content
- date
- active (boolean)
- created_at, updated_at
```

### Events
```
- id (Primary Key)
- title
- description
- event_date
- start_time, end_time
- location
- is_featured (boolean)
- month, day
- active (boolean)
- created_at, updated_at
```

### Initiatives
```
- id (Primary Key)
- title
- description
- emoji
- progress_percentage (0-100)
- theme (t1-t6 for colors)
- active (boolean)
- created_at, updated_at
```

### Event Registrations
```
- id (Primary Key)
- event_id (Foreign Key → events.id)
- first_name, last_name
- email, grade
- created_at
```

### Contact Submissions
```
- id (Primary Key)
- first_name, last_name
- email, grade
- subject, message
- read (boolean)
- created_at
```

### Survey Responses
```
- id (Primary Key)
- survey_id
- student_name, email, grade
- response
- created_at
```

---

## 🔒 Security Notes

1. **Change Default Credentials:**
   - Update admin login credentials in `admin.html`
   - Look for the `handleLogin()` function
   
2. **Enable Row Level Security (RLS):**
   - In Supabase, enable RLS on all tables
   - Create policies to restrict access to admin users only

3. **Protect Your API Keys:**
   - Never commit real API keys to public repositories
   - Use environment variables in production

4. **Password Security:**
   - For production, use Supabase Authentication instead of hardcoded credentials

---

## 📝 Adding Content via Admin Panel

### To Add an Announcement:
1. Go to Admin Panel → Announcements
2. Click "+ New Announcement"
3. Fill in title, content, and date
4. Click "Save Announcement"
5. It appears on the website immediately

### To Add an Event:
1. Go to Admin Panel → Events
2. Click "+ New Event"
3. Fill in all details and check "Featured Event?" if needed
4. Click "Save Event"
5. Featured events appear in the spotlight section

### To Add an Initiative:
1. Go to Admin Panel → Initiatives
2. Click "+ New Initiative"
3. Fill in title, emoji, description, and progress %
4. Choose a theme (t1-t6)
5. Click "Save Initiative"

---

## 🌐 Deploying to Production

### Hosting Options:
- **Vercel** - Free, optimized for Next.js (can host static HTML too)
- **Netlify** - Free, great for static sites
- **GitHub Pages** - Free, simple
- **Traditional Hosting** - Upload files via FTP

### Steps:
1. Push files to a hosting service
2. Update `config.js` with production Supabase keys
3. Access admin at: `yourdomain.com/admin`

### Example (Netlify):
```
netlify deploy --prod --dir .
```

---

## ❓ Troubleshooting

### "Connection Error" on Website
- Check that `config.js` has correct Supabase URL and keys
- Verify Supabase project is active
- Check browser console (F12) for error messages

### Admin Panel Won't Load
- Ensure `config.js` is in the same directory
- Check that Supabase JS library is loaded (see script tag)
- Clear browser cache

### Data Not Showing
- Check database tables are created correctly
- Verify data has `active = true`
- Check browser console for SQL errors

### Form Submissions Not Saving
- Verify `contact_submissions` table exists
- Check that RLS isn't blocking inserts
- Look at browser Network tab to see Supabase requests

---

## 📱 Additional Features

### Event Registration Form
Currently the contact form saves all submissions. To create a dedicated event registration:

1. Add a registration modal on event click
2. Save to `event_registrations` table with `event_id`
3. Display registrations in admin panel (already included!)

### Survey
To add a survey:

1. Create a survey form on a new page
2. Save responses to `survey_responses` table
3. View results in admin panel

---

## 🔄 Real-Time Updates

The website checks for new data when it loads. To add real-time updates:

```javascript
// Subscribe to announcements changes
client.from('announcements')
  .on('*', payload => {
    loadAnnouncements();
  })
  .subscribe();
```

---

## 📞 Support

- **Supabase Docs:** https://supabase.com/docs
- **Supabase Community:** https://discord.gg/wMp6pzwK

---

## 📝 Checklist Before Launch

- [ ] Updated `config.js` with real Supabase credentials
- [ ] Changed admin login credentials
- [ ] Created all database tables
- [ ] Added sample content via admin panel
- [ ] Tested contact form submissions
- [ ] Verified all sections load correctly
- [ ] Set up proper hosting
- [ ] Enabled RLS on database tables
- [ ] Tested on mobile devices
- [ ] Set up custom domain

---

**Happy managing your Student Council! 🎓**

### Step 5: Set Up Teacher Accounts

To add teacher accounts for managing events and forms:

1. In Supabase, go to **SQL Editor**
2. Run the SQL commands from TEACHER_SETUP.md to add teacher accounts
3. Teachers can access: **yourdomain.com/teacher** (or ile:///path/to/teacher.html locally)

**Teacher Access:**
- Create and manage events
- Build custom registration forms for events
- View and edit event registrations
