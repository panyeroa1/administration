/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_EBURON_AI_API_KEY?: string;
  readonly VITE_EBURON_PUBLIC_KEY?: string;
  readonly VITE_EBURON_API_KEY?: string;
  readonly VITE_EBURON_ASSISTANT_ID?: string;
  readonly VITE_EBURON_PHONE_NUMBER_ID?: string;
  readonly VITE_SITE_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
