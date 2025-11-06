import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || (typeof window !== 'undefined' && window.__SUPABASE_URL) || 'https://YOUR-PROJECT.supabase.co';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || (typeof window !== 'undefined' && window.__SUPABASE_ANON_KEY) || null;

if (!ANON_KEY) {
  console.warn('VITE_SUPABASE_ANON_KEY no disponible. Configurala en .env.local o en los Secrets de GitHub.');
}

if (!globalThis.__supabaseClient && ANON_KEY) {
  globalThis.__supabaseClient = createClient(SUPABASE_URL, ANON_KEY);
}

export const supabase = globalThis.__supabaseClient;
export default supabase;