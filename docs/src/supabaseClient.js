import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client singleton
 * (Archivo para pegar tal cual en src/supabaseClient.js)
 *
 * NOTA: ANON KEY y URL apuntan al proyecto correcto (lpxs...) tal como probaste.
 */

const SUPABASE_URL = 'https://lpxsqxgrxdssjoqtdgve.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzYSIsInJlZiI6ImxweHNxeGdyeGRzc2pvcXRkZ3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NTQ2ODksImV4cCI6MjA3NzUzMDY4OX0.uwNO82cwjiP-SUtEluS39jw8HrHQo6ANmziHxDdOiGY';

if (!globalThis.__supabaseClient) {
  globalThis.__supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const supabase = globalThis.__supabaseClient;
export default supabase;
