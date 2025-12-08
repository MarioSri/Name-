import { createClient } from '@supabase/supabase-js';

// Environment variables - must be set in .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error(
    'Missing required environment variable: VITE_SUPABASE_URL. ' +
    'Please set this in your .env file. See .env.example for reference.'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing required environment variable: VITE_SUPABASE_ANON_KEY. ' +
    'Please set this in your .env file. See .env.example for reference.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
