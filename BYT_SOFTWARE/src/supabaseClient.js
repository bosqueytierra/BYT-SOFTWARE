import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client singleton
 * (Generado por petición del propietario)
 *
 * NOTA: Este archivo contiene la Public ANON KEY hardcodeada por instrucción expresa.
 * En producción es más seguro mover la clave a variables de entorno / GitHub Secrets.
 */

const SUPABASE_URL = 'https://paatfcaylifoqbsqqvpq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYXRmY2F5bGlmb3FxdnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzODg2NTgsImV4cCI6MjA3NTk2NDY1OH0.A4-1_eqqWhYDTFvqrdolwNQgx4HUsVNE07Y_VK25feE';

if (!globalThis.__supabaseClient) {
  globalThis.__supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const supabase = globalThis.__supabaseClient;
export default supabase;
