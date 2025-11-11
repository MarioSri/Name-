import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://goupzmplowjbnnxmnvou.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvdXB6bXBsb3dqYm5ueG1udm91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNTQ5MjcsImV4cCI6MjA2OTczMDkyN30.0B7Q6tpd-xCbg2kg0oei5nsBz9nya7Z0RGG6EhXVhew';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
