
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

// Google OAuth sign-in for Gmail integration
export const signInWithGoogle = async () => {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly',
      redirectTo: window.location.origin,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
};

// Check if user has Google OAuth token (for Gmail features)
export const hasGoogleToken = async (): Promise<boolean> => {
  if (!supabase) return false;
  
  const { data: { session } } = await supabase.auth.getSession();
  return !!(session?.provider_token && session?.user?.app_metadata?.provider === 'google');
};
