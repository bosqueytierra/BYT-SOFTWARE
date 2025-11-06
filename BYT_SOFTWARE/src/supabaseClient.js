import { createClient } from '@supabase/supabase-js';

/**
 * Canonical Supabase client singleton used by the app at runtime.
 *
 * NOTE: Do NOT commit real anon/service keys to the repo. Use env vars or
 * inject the anon key at build time. For quick local testing you can set
 * window.__SUPABASE_ANON_KEY in the browser console before loading the app.
 */

const SUPABASE_URL = 'https://qwbeectinjasekkjzxls.supabase.co';

// prefer environment at build time, then fallback to an injected global
const SUPABASE_ANON_KEY =
  (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof window !== 'undefined' && window.__SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3YmVlY3Rpbmphc2Vra2p6eGxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NjM5NjAsImV4cCI6MjA3ODAzOTk2MH0.oqGQKlsJLMe3gpiVqutblOhlT4gn2ZOCWKKpO7Slo4U';

if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3YmVlY3Rpbmphc2Vra2p6eGxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NjM5NjAsImV4cCI6MjA3ODAzOTk2MH0.oqGQKlsJLMe3gpiVqutblOhlT4gn2ZOCWKKpO7Slo4U') {
  // fail fast in development so you notice the missing key
  // but in production you may want a different strategy/logging
  // console.warn('Supabase anon key not provided. Set VITE_SUPABASE_ANON_KEY or window.__SUPABASE_ANON_KEY');
}

if (!globalThis.__supabaseClient) {
  globalThis.__supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const supabase = globalThis.__supabaseClient;
export default supabase;
