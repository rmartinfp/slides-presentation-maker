import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://okzaoakyasaohohktntd.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9remFvYWt5YXNhb2hvaGt0bnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NDE4NTYsImV4cCI6MjA4OTUxNzg1Nn0.nIr8J7Hjalwd4Nix7-BM4nwAn6HYLb3F1An_iFJwkCI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
