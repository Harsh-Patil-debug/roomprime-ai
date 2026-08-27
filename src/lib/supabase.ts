import { createClient } from "@supabase/supabase-js";

const env = import.meta.env;
const supabaseUrl = env["VITE_SUPABASE_URL"] || "https://your-placeholder-supabase-url.supabase.co";
const supabaseAnonKey = env["VITE_SUPABASE_ANON_KEY"] || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = !!(
  env["VITE_SUPABASE_URL"] && 
  env["VITE_SUPABASE_ANON_KEY"]
);
