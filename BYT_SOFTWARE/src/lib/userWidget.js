// Minimal global user header widget.
// Lee localStorage.byt_user (JSON) y muestra nombre/email/avatar.
// Escucha 'storage' para sincronizar entre pestañas.
// No dependencias externas; no Supabase (más simple y seguro para frontend).

function safeParse(s){ try{ return JSON.parse(s); }catch(e){ return {}; } }

function shortId(id=''){ return id ? id.slice(0,8)+'…' : ''; }

function buildUnauthHtml(){ 
  return `
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="color:#666">No autenticado</div>
      <a href="/BYT_SOFTWARE/src/pages/login/login.html" style="padding:8px 12px;background:#2e5e4e;color:#fff;border-radius:6px;text-decoration:none;">Entrar</a>
    </div>
  `;
}

function buildUserHtml(user){
  const name = user?.user_metadata?.full_name || user?.full_name || user?.email || shortId(user?.id);
  const email = user?.email || '';
  const avatar = user?.avatar_url || user?.user_metadata?.avatar_url || ('https://www.gravatar.com/avatar/' + (email || '').trim().toLowerCase() + '?d=mp&s=64');
  return `
    <div style="display:flex;align-items:center;gap:12px;">
      <img src="${avatar}" alt="avatar" style="width:44px;height:44px;border-radius:50%;object-fit:cover;background:#f0f0f0;">
      <div style="text-align:right;">
        <div style="font-weight:600;color:#16362e;">${name}</div>
        <div style="font-size:12px;color:#666;">${email}</div>
      </div>
      <div><button id="bytLogoutBtn" style="padding:8px 12px;border:1px solid #2e5e4e;border-radius:8px;background:#fff;color:#2e5e4e;cursor:pointer;">Cerrar Sesión</button></div>
    </div>
  `;
}

function getUserFromStorage(){
  return safeParse(localStorage.getItem('byt_user') || '{}');
}

function logoutAndRedirect(){
  localStorage.removeItem('byt_logged_in');
  localStorage.removeItem('byt_user');
  try{ localStorage.setItem('byt_last_action', JSON.stringify({ type:'logout', at: Date.now() })); }catch(e){}
  // redirect to login
  window.location.href = '/BYT_SOFTWARE/src/pages/login/login.html';
}

export function renderUserHeader(rootId = 'siteHeader'){
  const root = document.getElementById(rootId);
  if(!root) return;
  // short header shell (logo + area)
  root.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;padding:10px 14px;background:transparent;">
      <div style="display:flex;align-items:center;gap:12px;">
        <img src="/BYT_SOFTWARE/assets/logo_byt.png" alt="BYT" style="height:40px;">
        <div>
          <div style="font-weight:700;color:#16362e;">BYT SOFTWARE</div>
          <div style="font-size:12px;color:#6b6b6b;">Sistema de Gestión - Bosque y Tierra</div>
        </div>
      </div>
      <div style="flex:1"></div>
      <div id="bytUserArea" style="display:flex;align-items:center;"></div>
    </div>
  `;

  const userArea = document.getElementById('bytUserArea');
  if(!userArea) return;

  function updateArea(){
    const user = getUserFromStorage();
    if(user && Object.keys(user).length){
      userArea.innerHTML = buildUserHtml(user);
      const btn = document.getElementById('bytLogoutBtn');
      if(btn) btn.onclick = logoutAndRedirect;
    } else {
      userArea.innerHTML = buildUnauthHtml();
    }
  }

  // initial render
  updateArea();

  // sync across tabs: when localStorage changes, update UI
  window.addEventListener('storage', (e) => {
    if(!e) return;
    if(e.key === 'byt_user' || e.key === 'byt_logged_in' || e.key === 'byt_last_action'){
      updateArea();
    }
  });

  return { update: updateArea, logout: logoutAndRedirect };
}
