// session-check.js - incluye en páginas protegidas como <script type="module" src="./session-check.js"></script>
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = window.__SUPABASE_URL || (import.meta.env?.VITE_SUPABASE_URL) || 'https://YOUR-PROJECT.supabase.co';
const ANON_KEY = window.__SUPABASE_ANON_KEY || (import.meta.env?.VITE_SUPABASE_ANON_KEY) || null;

const sup = createClient(SUPABASE_URL, ANON_KEY);

(async () => {
  const { data } = await sup.auth.getSession();
  const session = data?.session;
  if (!session) {
    window.location.href = '/BYT_SOFTWARE/src/pages/login/login.html';
  } else {
    // opcional: exponer user para la página
    window.__USER = session.user;
  }
})();