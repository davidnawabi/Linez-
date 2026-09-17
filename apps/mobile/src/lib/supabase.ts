import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set (see .env.example)');
}

// Anon key only -- the mobile app never holds the service role key. Writes
// that need server-side verification (report submission) go through
// apps/api instead of straight to Supabase from the client.
export const supabase = createClient(supabaseUrl, anonKey);
