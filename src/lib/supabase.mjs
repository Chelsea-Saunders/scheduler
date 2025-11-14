import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// initialize supabase with env varables
const SUPABASE_URL = "https://aprjqcslwctjadrzhkrm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcmpxY3Nsd2N0amFkcnpoa3JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNDA4MTksImV4cCI6MjA3ODcxNjgxOX0.SXT_E0cQvxa-Zk0J1g0kKq6ifD-RRed3SmhaP5fHwoI";
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