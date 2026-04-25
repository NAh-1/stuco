// Supabase Configuration
// Get these from your Supabase project settings

const SUPABASE_URL = 'https://fdiqzytczxyqpzffbtlb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkaXF6eXRjenh5cXB6ZmZidGxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjY5NjMsImV4cCI6MjA5MTg0Mjk2M30.fdsHVQG3U7TTHKgG1mtHwkWB8869vBx195SoYxf6NEE';

// Initialize Supabase Client
const { createClient } = supabase;
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
