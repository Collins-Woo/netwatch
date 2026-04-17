import { createClient } from '@supabase/supabase-js';

// Create Supabase clients
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Public client (for browser/client access)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client (for server-side operations)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export { supabaseUrl, supabaseAnonKey };
