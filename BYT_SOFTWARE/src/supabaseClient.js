import { createClient } from '@supabase/supabase-js';

/**
 * Canonical Supabase client singleton used by the app at runtime.
 *
 * NOTE: Do NOT commit real anon/service keys to the repo. Use env vars or
 * inject the anon key at build time. For quick local testing you can set
 * window.__SUPABASE_ANON_KEY in the browser console before loading the app.
 */

const SUPABASE_URL = 'https://paatfcaylifoqbsqqvpq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYXRmY2F5bGlmb3Fic3FxdnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzODg2NTgsImV4cCI6MjA3NTk2NDY1OH0.A4-1_eqqWhYDTFvqrdolwNQgx4HUsVNE07Y_VK25feE';
  // prefer environment at build time, then fallback to an injected global
  (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof window !== 'undefined' && window.__SUPABASE_ANON_KEY) ||
  '<REPLACE_WITH_ANON_KEY_AT_BUILD>';

if (!globalThis.__supabaseClient) {
  globalThis.__supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const supabase = globalThis.__supabaseClient;
export default supabase;
