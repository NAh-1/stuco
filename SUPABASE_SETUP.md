# Supabase Setup Guide for STUCO Website

## Step 1: Create Supabase Project
1. Go to https://supabase.com and sign up/log in
2. Create a new project
3. Note your **Project URL** and **Anon Public Key**

## Step 2: Create Database Tables

Run these SQL commands in your Supabase SQL Editor:

### News/Announcements Table
```sql
CREATE TABLE announcements (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  date TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Events Table
```sql
CREATE TABLE events (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  event_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  location TEXT NOT NULL,
  is_featured BOOLEAN DEFAULT false,
  month TEXT,
  day TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Initiatives Table
```sql
CREATE TABLE initiatives (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  emoji TEXT,
  progress_percentage INT DEFAULT 0,
  theme TEXT DEFAULT 't1',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Event Registrations Table
```sql
CREATE TABLE event_registrations (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  grade TEXT NOT NULL,
  responses JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**If you already created the table without the `responses` column, run this ALTER command:**
```sql
ALTER TABLE event_registrations ADD COLUMN responses JSONB;
```

### Registration Form Fields Table
Run this SQL in your Supabase SQL editor before using the form builder:
```sql
CREATE TABLE registration_form_fields (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  type TEXT NOT NULL,
  options TEXT,
  required BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Disable RLS for admin-only table
ALTER TABLE registration_form_fields DISABLE ROW LEVEL SECURITY;
```

**If you already created the table and need to disable RLS:**
```sql
ALTER TABLE registration_form_fields DISABLE ROW LEVEL SECURITY;
```

### Contact Form Submissions Table
```sql
CREATE TABLE contact_submissions (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Survey Responses Table
```sql
CREATE TABLE survey_responses (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  survey_id BIGINT,
  student_name TEXT,
  email TEXT,
  grade TEXT,
  response TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Admin Accounts Table
```sql
CREATE TABLE admin_accounts (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Step 3: Update config.js

Create a `config.js` file in your project with your Supabase credentials:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

## Step 4: Enable RLS (Row Level Security)

For security, enable RLS on tables and create policies as needed.

## Step 5: Access Your Admin Panel

Visit: `yourdomain.com/admin` to access the admin panel

---

For more help with Supabase: https://supabase.com/docs
