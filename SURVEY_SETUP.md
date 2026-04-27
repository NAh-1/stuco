# Survey Feature Setup Guide

This guide explains how to set up the database tables needed for the survey feature and how to use the survey sharing functionality.

## Overview

The survey feature allows you to:
- **Create surveys** with multiple question types from the admin panel
- **Share unique survey links** with students (similar to event registration)
- **Track anonymous responses** with full analytics in the admin panel
- **Customize questions** on the fly

## Database Tables

You need to create two tables in your Supabase database:

### 1. `surveys` Table

```sql
CREATE TABLE surveys (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL,
  active BOOLEAN DEFAULT FALSE,
  main BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Fields:**
- `id`: Unique identifier (auto-generated)
- `title`: Survey title (e.g., "School Experience Feedback")
- `description`: Optional survey description
- `questions`: JSON array of question objects with structure:
  ```json
  [
    {
      "question": "Question text here?",
      "type": "text|textarea|radio|checkbox|dropdown",
      "options": ["Option 1", "Option 2"],
      "required": true
    }
  ]
  ```
- `active`: Whether this survey is currently active (only one survey should be active at a time)
- `main`: Whether this is the main survey linked from the homepage
- `created_at`: Timestamp when survey was created
- `updated_at`: Timestamp when survey was last updated

### 2. `survey_responses` Table

```sql
CREATE TABLE survey_responses (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  survey_id BIGINT REFERENCES surveys(id) ON DELETE CASCADE,
  responses JSONB NOT NULL,
  submitted_at TIMESTAMP DEFAULT NOW()
);
```

**Fields:**
- `id`: Unique identifier (auto-generated)
- `survey_id`: Reference to the survey (foreign key)
- `responses`: JSON object with question-answer pairs:
  ```json
  {
    "What is your name?": "John Doe",
    "How satisfied are you?": "Very Satisfied"
  }
  ```
- `submitted_at`: Timestamp when response was submitted

**⚠️ IMPORTANT: If you have an old survey_responses table with different columns (student_name, email, grade, response), you need to drop and recreate it:**

```sql
-- Drop the old table
DROP TABLE survey_responses;

-- Create the new table
CREATE TABLE survey_responses (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  survey_id BIGINT REFERENCES surveys(id) ON DELETE CASCADE,
  responses JSONB NOT NULL,
  submitted_at TIMESTAMP DEFAULT NOW()
);
```

## Setting Up the Tables

### Important Notes:
- **Create tables in this order:** surveys table first, then survey_responses table
- **If you get "column 'id' referenced in foreign key constraint does not exist":** The surveys table doesn't exist yet. Create it first.
- **Check existing tables:**
  ```sql
  SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
  ```
- **If tables exist with wrong structure:**
  ```sql
  DROP TABLE IF EXISTS survey_responses;
  DROP TABLE IF EXISTS surveys;
  -- Then recreate both tables
  ```

### Option 1: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to the "SQL Editor" section
3. Create a new query
4. **First, create the surveys table:**
   ```sql
   CREATE TABLE surveys (
     id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
     title TEXT NOT NULL,
     description TEXT,
     questions JSONB NOT NULL,
     active BOOLEAN DEFAULT FALSE,
     main BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );
   ```
5. **Then, create the survey_responses table:**
   ```sql
   CREATE TABLE survey_responses (
     id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
     survey_id BIGINT REFERENCES surveys(id) ON DELETE CASCADE,
     responses JSONB NOT NULL,
     submitted_at TIMESTAMP DEFAULT NOW()
   );
   ```
6. Click "Run" to execute each query separately

### Option 2: Using Supabase CLI

```bash
# Connect to your database
psql <your-connection-string>

# Create surveys table first
psql> CREATE TABLE surveys (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL,
  active BOOLEAN DEFAULT FALSE,
  main BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

# Then create survey_responses table
psql> CREATE TABLE survey_responses (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  survey_id BIGINT REFERENCES surveys(id) ON DELETE CASCADE,
  responses JSONB NOT NULL,
  submitted_at TIMESTAMP DEFAULT NOW()
);
```

### Option 3: If You Already Have Tables

**Check if surveys table exists:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'surveys';
```

**If surveys table exists but has wrong structure, drop and recreate:**
```sql
DROP TABLE IF EXISTS survey_responses;
DROP TABLE IF EXISTS surveys;

-- Then recreate both tables as shown above
```

## Row Level Security (RLS) Policies

### For `surveys` table:
- Admins can create, read, update, and delete surveys
- Public users can only read active surveys

### For `survey_responses` table:
- Public users can insert responses (for anonymous submissions)
- Admins can read and delete responses
- Public users cannot read/modify responses

### Setting up RLS Policies:

```sql
-- Enable RLS on both tables
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- Surveys table policies
-- Allow public to read active surveys
CREATE POLICY "Public can read active surveys" ON surveys
FOR SELECT USING (active = true);

-- Allow authenticated users (admins) to do everything
CREATE POLICY "Admins can manage surveys" ON surveys
FOR ALL USING (auth.role() = 'authenticated');

-- Survey responses table policies
-- Allow public to insert responses
CREATE POLICY "Public can insert survey responses" ON survey_responses
FOR INSERT WITH CHECK (true);

-- Allow authenticated users (admins) to read and delete responses
CREATE POLICY "Admins can manage survey responses" ON survey_responses
FOR ALL USING (auth.role() = 'authenticated');

-- For development: Disable RLS on survey_responses since admin panel has its own auth
-- Remove this in production and implement proper Supabase Auth
ALTER TABLE survey_responses DISABLE ROW LEVEL SECURITY;
```

**Important:** Make sure to run these RLS policies in your Supabase SQL editor after creating the tables.

## Using the Survey Feature

### Admin Panel - Creating a Survey

1. Go to **admin.html**
2. Navigate to the **"Surveys"** section (in the sidebar)
3. Click **"+ Create Survey"**
4. Enter a survey title
5. Configure questions:
   - Click **"+ Add Question"** to add more questions
   - Set question type (Short Text, Long Text, Multiple Choice, Checkboxes, Dropdown)
   - For choice-based questions, enter options separated by commas
   - Mark questions as required/optional
6. Click **"Create Survey"** to save

### Admin Panel - Sharing Survey Link

1. After creating a survey, it appears under "Active Survey"
2. The unique survey link is displayed with a **"Copy Link"** button
3. Click to copy the link automatically
4. Share this link with students via email, social media, or announcements
5. The link format is: `survey.html?survey_id=123`

### Student View - Taking Survey

1. Students click the unique survey link
2. See survey title and description
3. Answer all questions (required fields marked with *)
4. Click **"Submit Survey"** to submit
5. See confirmation message

### Admin Panel - Viewing Responses

1. Go to **admin.html** → **"Surveys"**
2. Scroll down to **"Survey Responses"**
3. See all submitted responses with timestamps
4. Delete individual responses as needed
5. Export response data for analysis

## Question Types

| Type | Use Case | Example |
|------|----------|---------|
| **Short Text** | Quick answers | "What's your name?" |
| **Long Text** | Detailed feedback | "What can we improve?" |
| **Multiple Choice** | Single selection | "How satisfied are you?" |
| **Checkboxes** | Multiple selections | "Which events interest you?" |
| **Dropdown** | Space-saving choice list | "Select your grade" |

## Example Survey Data

Here's an example of survey data you can insert:

```sql
INSERT INTO surveys (title, description, questions, active) VALUES (
  'School Experience Feedback',
  'Help us understand what makes your school experience great!',
  '[
    {
      "question": "What aspects of school do you enjoy most?",
      "type": "checkbox",
      "options": ["Events", "Classes", "Clubs", "Sports", "Other"],
      "required": true
    },
    {
      "question": "How satisfied are you with school events?",
      "type": "radio",
      "options": ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied"],
      "required": true
    },
    {
      "question": "What can we improve?",
      "type": "textarea",
      "options": [],
      "required": false
    }
  ]',
  true
);
```

## Files Included

- **`survey.html`** - Dedicated survey page (shared via unique link)
- **`admin.html`** - Admin survey management panel
- **`index.html`** - Updated with survey section linking to survey.html
- **`config.js`** - Supabase configuration (existing)

## Key Features

✅ **Unique Shareable Links** - Each survey gets a unique URL with survey_id parameter  
✅ **Anonymous Responses** - No personally identifying information collected  
✅ **Multiple Question Types** - Text, textarea, radio, checkbox, dropdown  
✅ **Required Field Validation** - Ensure critical questions are answered  
✅ **Easy Admin Management** - Create, edit, activate, deactivate surveys  
✅ **Response Analytics** - View and analyze all submitted responses  
✅ **One Active Survey** - Only one survey is active at a time (prevents confusion)  

## Tips

- Creating a new survey automatically deactivates any previous surveys
- Responses are stored with full question text for easy analysis
- Use checkboxes for "select all that apply" questions
- Use radio buttons for single-choice questions
- Deactivate surveys when not in use to avoid multiple surveys being active
- Share survey links in announcements, emails, and social media
- Export response data for further analysis in spreadsheets

## Troubleshooting

**Survey responses not showing in admin panel:**
- Check that you're using the correct `survey_responses` table structure (with `responses` JSONB column, not individual name/email/grade columns)
- If you have the old table structure, drop and recreate it using the commands above
- Make sure the survey is marked as "active" in the admin panel
- Check browser console for any JavaScript errors

**Survey not loading:**
- Check that the `survey_id` parameter is correctly passed in the URL
- Verify the survey exists and is marked as active

**Responses not saving:**
- Ensure the `survey_responses` table has write permissions
- Check browser console for error messages
- Verify RLS policies are set up correctly

**"Make Main Survey" button not working:**
- Check browser console for JavaScript errors
- Ensure the survey exists in the database

**Homepage survey link not updating:**
- Make sure a survey is marked as both "main" and "active"
- Check browser console for any errors when loading the homepage
