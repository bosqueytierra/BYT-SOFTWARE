// Cliente Supabase listo para navegador (ESM desde CDN)
// Ruta: BYT_SOFTWARE/src/js/supabaseBrowserClient.js
// NOTA: La ANON KEY está embebida según tu solicitud.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://qwbeectinjasekkjzxls.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3YmVlY3Rpbmphc2Vra2p6eGxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NjM5NjAsImV4cCI6MjA3ODAzOTk2MH0.oqGQKlsJLMe3gpiVqutblOhlT4gn2ZOCWKKpO7Slo4U';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase URL o ANON KEY no definidas en supabaseBrowserClient.js');
}

const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// export nombrado y por defecto
export const supabase = _supabase;
export default supabase;

// Exponer en window para pruebas rápidas y compatibilidad
if (typeof window !== 'undefined') {
  window.supabase = _supabase;
  window.__SUPABASE_URL = SUPABASE_URL;
  window.__SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
}
