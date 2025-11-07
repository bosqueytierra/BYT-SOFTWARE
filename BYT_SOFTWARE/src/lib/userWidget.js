// BYT_SOFTWARE/src/lib/userWidget.js
// Módulo que renderiza el header con info del usuario y logout.
// Usa localStorage.byt_user (JSON) o consulta Supabase si hace falta.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = window.__SUPABASE_URL || 'https://qwbeectinjasekkjzxls.supabase.co';
const ANON_KEY = window.__SUPABASE_ANON_KEY || null;
const sup = ANON_KEY ? createClient(SUPABASE_URL, ANON_KEY) : null;

function safeParse(s) {
  try { return JSON.parse(s); } catch (e) { return null; }
}

function shortId(id = '') {
  return id ? (id.slice(0,8) + '…') : '';
}

function buildHeaderHtml() {
  // Ajusta la ruta del logo si tu despliegue requiere otro path.
  const logoPath = '/BYT_SOFTWARE/assets/logo_byt.png';
  return `
    <div class="byt-header" style="display:flex;align-items:center;gap:16px;padding:12px;background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,0.04);">
      <div style="display:flex;align-items:center;gap:12px;">
        <img src="${logoPath}" alt="BYT" style="height:44px">
        <div>
          <div style="font-weight:700;color:#16362e;">BYT SOFTWARE</div>
          <div style="font-size:12px;color:#6b6b6b;">Sistema de Gestión - Bosque y Tierra</div>
        </div>
      </div>
      <div style="flex:1"></div>
      <div id="bytUserArea" style="display:flex;align-items:center;gap:12px;">
        <!-- user content inserted dinamically -->
      </div>
    </div>
  `;
}

async function getUserFromSession() {
  try {
    if (!sup) return null;
    const { data } = await sup.auth.getSession();
    const session = data?.session;
    return session?.user ?? null;
  } catch (e) {
    return null;
  }
}

export async function renderUserHeader(rootId = 'siteHeader') {
  const root = document.getElementById(rootId);
  if (!root) return;

  root.innerHTML = buildHeaderHtml();
  const userArea = document.getElementById('bytUserArea');

  async function update() {
    const stored = safeParse(localStorage.getItem('byt_user') || '{}');
    let user = (stored && Object.keys(stored).length) ? stored : null;
    if (!user) {
      user = await getUserFromSession();
    }

    if (!user) {
      userArea.innerHTML = `
        <div style="color:#666;font-size:14px;">No autenticado</div>
        <a href="/BYT_SOFTWARE/src/pages/login/login.html" class="btn" style="padding:8px 12px;border-radius:6px;background:#2e5e4e;color:#fff;text-decoration:none;">Entrar</a>
      `;
      return;
    }

    const displayName = user.user_metadata?.full_name || user.full_name || (user.email || shortId(user.id));
    const email = user.email || '';
    const avatarUrl = user.avatar_url || user.user_metadata?.avatar_url || ('https://www.gravatar.com/avatar/' + (email || '').trim().toLowerCase() + '?d=mp&s=64');

    userArea.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <img src="${avatarUrl}" alt="avatar" style="width:44px;height:44px;border-radius:50%;object-fit:cover;background:#f0f0f0;">
        <div style="text-align:right;">
          <div style="font-weight:600;color:#16362e;">${displayName}</div>
          <div style="font-size:12px;color:#666;">${email}</div>
        </div>
        <div><button id="bytLogoutBtn" style="padding:8px 12px;border:1px solid #2e5e4e;border-radius:8px;background:#fff;color:#2e5e4e;cursor:pointer;">Cerrar Sesión</button></div>
      </div>
    `;

    const btn = document.getElementById('bytLogoutBtn');
    if (btn) btn.addEventListener('click', logout);
  }

  async function logout() {
    try {
      if (sup) await sup.auth.signOut();
    } catch (e) {
      console.warn('signOut error', e);
    }
    localStorage.removeItem('byt_logged_in');
    localStorage.removeItem('byt_user');
    try { localStorage.setItem('byt_last_action', JSON.stringify({ type: 'logout', at: Date.now() })); } catch(e) {}
    window.location.href = '/BYT_SOFTWARE/src/pages/login/login.html';
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'byt_user' || e.key === 'byt_logged_in' || e.key === 'byt_last_action') {
      update().catch(console.error);
    }
  });

  await update();
}
