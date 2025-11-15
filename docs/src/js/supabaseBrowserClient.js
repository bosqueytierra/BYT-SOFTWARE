// Supabase browser client initializer
// Crea window.supabase si no existe, usando el CDN ESM de supabase-js.
// Contiene la URL y ANON KEY proporcionadas.

(async function initSupabaseBrowserClient(){
  try {
    // Si ya está creado, no hacemos nada
    if (window.supabase && typeof window.supabase.from === 'function') {
      console.log('[supabaseBrowserClient] window.supabase ya inicializado');
      return;
    }

    // Tu URL y ANON KEY (los dejé tal como me pediste)
    const SUPABASE_URL = 'https://qwbeectinjasekkjzxls.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3YmVlY3Rpbmphc2Vra2p6eGxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NjM5NjAsImV4cCI6MjA3ODAzOTk2MH0.oqGQKlsJLMe3gpiVqutblOhlT4gn2ZOCWKKpO7Slo4U';

    // Import dinámico de la versión ESM de supabase-js desde jsdelivr
    const module = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    const { createClient } = module;

    window.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      // Opciones opcionales: por ejemplo tiempo de espera
      // fetch: window.fetch
    });

    console.log('[supabaseBrowserClient] window.supabase inicializado con URL y ANON KEY');
  } catch (err) {
    console.error('[supabaseBrowserClient] Error inicializando supabase client:', err);
  }
})();
