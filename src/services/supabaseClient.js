import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jyhuvmqibfvmfutcvzhw.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5aHV2bXFpYmZ2bWZ1dGN2emh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4MTk4ODUsImV4cCI6MjEwMjM5NTg4NX0.b9Hp0-R7Bs_e1IAt5fXJ19AxBYuvmYklAT5mPa-Meyo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
