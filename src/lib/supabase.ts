import { createClient } from "@supabase/supabase-js";

// 1. Get these URLs and Keys from your Supabase Dashboard
// (Project Settings -> API)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 2. Add a safety check for the hackathon
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ Supabase environment variables are missing. Check your .env file.",
  );
}

// 3. Export the connected client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);