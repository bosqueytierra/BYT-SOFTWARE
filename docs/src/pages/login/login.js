// login.js - usa supabase-js (v2 via CDN) para email/password sign-in,
// registra byt_logged_in en localStorage para la lógica existente del proyecto.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

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

const sup = createClient(SUPABASE_URL, ANON_KEY);

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
