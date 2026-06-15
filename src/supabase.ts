import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL?.trim() ||
  'https://gssfqmiynesmtvbmeklb.supabase.co';

const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ||
  'sb_publishable_Z69YN1bMWNr9kI3Aqib6eA_L0lSySxZ';

export const LINE_LOGIN_URL =
  import.meta.env.VITE_LINE_LOGIN_URL?.trim() ||
  `${SUPABASE_URL}/functions/v1/line-login`;

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && supabasePublishableKey,
);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
