import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oldhaibgfhtlsrptankf.supabase.co'; // replace with your Supabase URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sZGhhaWJnZmh0bHNycHRhbmtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4OTY3NDMsImV4cCI6MjA2NTQ3Mjc0M30.w5BcNNrX1_dhRjQbtMudW4zPlzmORGm0xJQDWyLt94k'; // replace with your anon public key

export const supabase = createClient(supabaseUrl, supabaseAnonKey);