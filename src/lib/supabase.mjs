import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// initialize supabase with env varables
const SUPABASE_URL = "https://xfdslzinmxioqupphpuo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZHNsemlubXhpb3F1cHBocHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDE4MTIsImV4cCI6MjA3NTQ3NzgxMn0.zB3LDzTXlSzqCnFHpEhYQa1iHWn9wZ0bOJ5kGgRklCM";
// initialize auth
export const supabase = createClient(
    SUPABASE_URL, 
    SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,       // keep user logged in on refresh
            autoRefreshToken: true,   // automatically refresh token
            detectSessionInUrl: true, // will handle redirect 
        },
    });