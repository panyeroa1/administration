
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = !!(supabaseUrl && supabaseKey);

if (!isConfigured) {
  console.error('Missing Supabase environment variables. App will render setup screen.');
}

export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseKey) 
  : null as any;
