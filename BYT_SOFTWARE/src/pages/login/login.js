// login.js - signInWithPassword minimal (supabase-js v2 via CDN)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Detectar URL + KEY: admite runtime injection vía window o import.meta.env
const SUPABASE_URL = window.__SUPABASE_URL || (import.meta.env?.VITE_SUPABASE_URL) || 'https://YOUR-PROJECT.supabase.co';
const ANON_KEY = window.__SUPABASE_ANON_KEY || (import.meta.env?.VITE_SUPABASE_ANON_KEY) || null;

const msgEl = document.getElementById('msg');
const form = document.getElementById('login-form');

if (!ANON_KEY || !SUPABASE_URL) {
  msgEl.textContent = 'Configuración de Supabase faltante. Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.';
  console.warn('Missing Supabase config:', { SUPABASE_URL, ANON_KEY });
}

const sup = createClient(SUPABASE_URL, ANON_KEY);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msgEl.textContent = 'Iniciando sesión...';
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const res = await sup.auth.signInWithPassword({ email, password });
    if (res.error) {
      msgEl.textContent = `Error: ${res.error.message || res.error}`;
      console.error('signIn error', res.error);
      return;
    }

    msgEl.textContent = 'Login OK. Redirigiendo...';
    // Ajusta la ruta destino según tu estructura
    window.location.href = '/BYT_SOFTWARE/src/pages/dashboard/dashboard.html';
  } catch (err) {
    console.error(err);
    msgEl.textContent = 'Error inesperado. Revisa la consola.';
  }
});