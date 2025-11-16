// login.js - usa supabase-js (v2 via CDN) para email/password sign-in,
// registra byt_logged_in en localStorage para la lógica existente del proyecto.

// IMPORTS
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { initializeSupabase } from '../../js/supabaseBrowserClient.js';

const SUPABASE_URL = window.__SUPABASE_URL || (import.meta.env?.VITE_SUPABASE_URL);
const ANON_KEY = window.__SUPABASE_ANON_KEY || (import.meta.env?.VITE_SUPABASE_ANON_KEY) || null;

console.log('login.js loaded', { SUPABASE_URL, hasAnon: !!ANON_KEY });

const form = document.getElementById('loginForm');
const msgEl = document.getElementById('msg');

if (!ANON_KEY || !SUPABASE_URL) {
  const text = 'Falta configuración Supabase. Añade ANON key temporal en login.html o configura build-time.';
  console.warn(text, { SUPABASE_URL, ANON_KEY });
  if (msgEl) msgEl.textContent = text;
}

// Cliente local usado para autenticar (se mantiene para la llamada a signIn)
const sup = createClient(SUPABASE_URL, ANON_KEY);

// Keys de localStorage que usamos para persistir credenciales entre páginas
const LS_KEY_URL = 'byt_supabase_url';
const LS_KEY_KEY = 'byt_supabase_anon_key';

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!ANON_KEY) {
    msgEl.textContent = 'Falta la ANON KEY. No se puede autenticar.';
    return;
  }

  msgEl.textContent = 'Iniciando sesión...';
  const email = document.getElementById('usuario').value.trim();
  const password = document.getElementById('password').value;

  try {
    // sup.auth.signInWithPassword devuelve { data, error }
    const { data, error } = await sup.auth.signInWithPassword({ email, password });
    console.log('signIn result', { data, error });

    if (error) {
      // Mostrar el mensaje de error devuelto por Supabase
      msgEl.textContent = `Error: ${error.message || JSON.stringify(error)}`;
      return;
    }

    const session = data?.session;
    const user = data?.user ?? session?.user;

    if (session) {
      // Intentar inicializar y exponer el cliente globalmente desde el flujo de login
      try {
        // Preferir pasar las credenciales que ya usamos en este archivo (las tomadas de window/__)
        const url = SUPABASE_URL || window.SUPABASE_URL || window.__SUPABASE_URL || null;
        const key = ANON_KEY || window.SUPABASE_ANON_KEY || window.__SUPABASE_ANON_KEY || null;

        const client = await initializeSupabase({ url, key });
        if (client && typeof client.from === 'function') {
          console.log('[login] initializeSupabase: Supabase inicializado y expuesto globalmente (y persistido en localStorage)');
          // initializeSupabase already persists creds in localStorage
        } else {
          // Fallback: si initializeSupabase por alguna razón devolvió null, exponemos el cliente local `sup` y persistimos las credenciales usadas
          console.warn('[login] initializeSupabase no devolvió cliente válido, exponiendo cliente local `sup` como fallback');
          try {
            if (typeof window !== 'undefined') {
              window.supabase = sup;
              window.globalSupabase = window.globalSupabase || {};
              window.globalSupabase.client = sup;
              try { window.dispatchEvent(new Event('supabase:ready')); } catch (e) {}
              // persistir las credenciales que usamos localmente (para futuras cargas)
              try {
                if (url) localStorage.setItem(LS_KEY_URL, url);
                if (key) localStorage.setItem(LS_KEY_KEY, key);
              } catch (e) { /* ignore */ }
              console.log('[login] fallback: window.supabase establecido desde cliente local `sup` y credenciales persistidas en localStorage');
            }
          } catch (e) {
            console.warn('[login] no se pudo exponer fallback sup en window', e);
          }
        }
      } catch (initErr) {
        console.error('[login] Error inicializando Supabase tras login:', initErr);
        // Intentamos exponer igualmente el cliente local `sup` como fallback y persistir credenciales
        try {
          if (typeof window !== 'undefined') {
            window.supabase = sup;
            window.globalSupabase = window.globalSupabase || {};
            window.globalSupabase.client = sup;
            try { window.dispatchEvent(new Event('supabase:ready')); } catch (e) {}
            try {
              if (SUPABASE_URL) localStorage.setItem(LS_KEY_URL, SUPABASE_URL);
              if (ANON_KEY) localStorage.setItem(LS_KEY_KEY, ANON_KEY);
            } catch (e) { /* ignore */ }
            console.log('[login] fallback tras error: window.supabase establecido desde cliente local `sup` y credenciales persistidas');
          }
        } catch (e) {
          console.warn('[login] no se pudo exponer fallback sup en window después de error', e);
        }
      }

      // Guardar flag que otras páginas del repo esperan
      localStorage.setItem('byt_logged_in', '1');
      localStorage.setItem('byt_user', JSON.stringify(user || {}));
      // Supabase-js guarda la sesión en localStorage también por defecto

      msgEl.style.color = 'green';
      msgEl.textContent = 'Login OK. Redirigiendo...';
      // Ajustá la ruta si tu menú principal está en otro lugar
      window.location.href = '../menu_principal.html';
      return;
    }

    msgEl.textContent = 'Respuesta inesperada de autenticación. Revisa la consola.';
    console.warn('Auth response sin session:', data);
  } catch (err) {
    console.error('signIn exception', err);
    msgEl.textContent = 'Error inesperado. Ver consola.';
  }
});
