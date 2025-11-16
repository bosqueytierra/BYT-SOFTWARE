// BYT_SOFTWARE/src/pages/login/login.js
// Login que utiliza el cliente centralizado (supabaseBrowserClient.js).
// Si el cliente central no está disponible se usa un fallback local creado dinámicamente.

import { initializeSupabase, ensureSupabase, getClient } from '/BYT_SOFTWARE/src/js/supabaseBrowserClient.js';

const SUPABASE_URL = window.__SUPABASE_URL || window.SUPABASE_URL || localStorage.getItem('byt_supabase_url') || null;
const ANON_KEY = window.__SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY || localStorage.getItem('byt_supabase_anon_key') || null;

console.log('login.js loaded', { SUPABASE_URL, hasAnon: !!ANON_KEY });

const form = document.getElementById('loginForm');
const msgEl = document.getElementById('msg');

const LS_KEY_URL = 'byt_supabase_url';
const LS_KEY_KEY = 'byt_supabase_anon_key';

function showMsg(text, color = '#000') {
  if (msgEl) {
    msgEl.style.color = color;
    msgEl.textContent = text;
  } else {
    console.log('login msg:', text);
  }
}

// Helper: attempt to sign in using a real supabase client instance
async function signInClient(client, email, password) {
  if (!client || !client.auth) throw new Error('Auth no disponible en el cliente');
  // v2: signInWithPassword, fallback a signIn si existe
  if (typeof client.auth.signInWithPassword === 'function') {
    return await client.auth.signInWithPassword({ email, password });
  }
  if (typeof client.auth.signIn === 'function') {
    return await client.auth.signIn({ email, password });
  }
  throw new Error('Método de auth no encontrado en cliente Supabase');
}

// Fallback: crear cliente local dinámicamente si ensureSupabase falla
async function createLocalClient(url, key) {
  if (!url || !key) return null;
  try {
    const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    const { createClient } = mod;
    return createClient(url, key);
  } catch (e) {
    console.error('createLocalClient: error importando supabase-js', e);
    return null;
  }
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  showMsg('Iniciando sesión...', '#000');

  const email = document.getElementById('usuario')?.value?.trim();
  const password = document.getElementById('password')?.value;

  if (!email || !password) {
    showMsg('Completa usuario y contraseña', 'red');
    return;
  }

  try {
    // 1) Intentar inicializar el cliente central (lee window/localStorage/JSON remoto)
    try {
      await initializeSupabase(); // no pasa url/key para usar auto-init (window/localStorage/server)
    } catch (e) {
      // no fatal, seguiremos con ensureSupabase o fallback
      console.warn('initializeSupabase lanzó error (no fatal):', e);
    }

    // 2) Esperar a que haya un cliente real disponible
    let client = await ensureSupabase(7000);

    // 3) Si no hay cliente tras ensure, intentar crear un cliente local con las credenciales presentes
    if (!client) {
      if (SUPABASE_URL && ANON_KEY) {
        client = await createLocalClient(SUPABASE_URL, ANON_KEY);
        if (client) {
          console.warn('[login] Se creó cliente local como fallback');
        }
      }
    }

    if (!client) {
      showMsg('No se pudo inicializar el cliente Supabase. Revisa la configuración.', 'red');
      console.error('login: no se obtuvo cliente Supabase (ensureSupabase y fallback fallaron)');
      return;
    }

    // 4) Intentar autenticar con el cliente obtenido
    const result = await signInClient(client, email, password).catch(err => ({ error: err }));
    const { data, error } = result;

    if (error) {
      // Si error es objeto de Supabase, puede tener message; si no, mostramos el toString
      const message = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
      showMsg(`Error: ${message}`, 'red');
      return;
    }

    // 5) Si autenticación exitosa, exponer y persistir credenciales (initializeSupabase con args persiste en localStorage)
    const session = data?.session;
    const user = data?.user ?? session?.user;

    // Llamar initializeSupabase con las credenciales detectadas para asegurar persistencia/exposición global
    try {
      const urlToPersist = SUPABASE_URL || (client?.supabaseUrl) || null;
      const keyToPersist = ANON_KEY || null;
      // Si tenemos url/key explícitas las pasamos para garantizar persistencia en localStorage por nuestra implementación.
      if (urlToPersist && keyToPersist) {
        await initializeSupabase({ url: urlToPersist, key: keyToPersist });
      } else {
        // si no, intentar exponer el cliente actual (en caso de cliente creado localmente)
        try {
          if (typeof window !== 'undefined') {
            window.supabase = client;
            window.globalSupabase = window.globalSupabase || {};
            window.globalSupabase.client = client;
            try { window.dispatchEvent(new Event('supabase:ready')); } catch (e) {}
          }
        } catch (e) { /* ignore */ }
      }
    } catch (initErr) {
      console.warn('[login] initializeSupabase tras auth lanzó error (no fatal):', initErr);
      // intentar exponer igualmente el cliente
      try {
        if (typeof window !== 'undefined') {
          window.supabase = client;
          window.globalSupabase = window.globalSupabase || {};
          window.globalSupabase.client = client;
          try { window.dispatchEvent(new Event('supabase:ready')); } catch (e) {}
        }
      } catch (e) {}
    }

    // Persistir marka de login y user
    try {
      localStorage.setItem('byt_logged_in', '1');
      if (user) localStorage.setItem('byt_user', JSON.stringify(user));
    } catch (e) { /* ignore */ }

    // Si initializeSupabase persiste keys en localStorage (implementación actual), ya quedaron guardadas.
    // Si no, guardamos las credenciales actuales por compatibilidad:
    try {
      if (SUPABASE_URL) localStorage.setItem(LS_KEY_URL, SUPABASE_URL);
      if (ANON_KEY) localStorage.setItem(LS_KEY_KEY, ANON_KEY);
    } catch (e) {}

    showMsg('Login OK. Redirigiendo...', 'green');

    // Redirigir a pantalla principal (ajustar ruta si necesario)
    setTimeout(() => {
      window.location.href = '../menu_principal.html';
    }, 700);

  } catch (err) {
    console.error('login exception', err);
    showMsg('Error inesperado. Mira la consola para más detalles.', 'red');
  }
});
