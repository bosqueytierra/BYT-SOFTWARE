import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client singleton (archivo para pegar tal cual en src/lib/supabaseClient.js)
 *
 * NOTA: Este archivo incluye la URL y la Public ANON KEY hardcodeadas tal como pediste.
 * Para producción es recomendable mover estas variables a Secrets/ENV y evitar subir claves a repos públicos.
 */

/* Proyecto (URL) */
const SUPABASE_URL = 'https://paatfcaylifoqbsqqvpq.supabase.co';

/* Public ANON KEY (proporcionada) */
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYXRmY2F5bGlmb3Fic3FxdnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzODg2NTgsImV4cCI6MjA3NTk2NDY1OH0.A4-1_eqqWhYDTFvqrdolwNQgx4HUsVNE07Y_VK25feE';

/* Evitar múltiples instancias en el mismo contexto (previene el warning Multiple GoTrueClient instances) */
if (!globalThis.__supabaseClient) {
  globalThis.__supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const supabase = globalThis.__supabaseClient;
export default supabase;
