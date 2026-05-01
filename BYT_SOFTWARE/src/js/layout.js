// Inyecta la shell y aplica menú unificado desde window.BYT_MENU (no docs)
(async function() {
  if (window._BYT_SHELL_APPLIED_) return;
  window._BYT_SHELL_APPLIED_ = true;

  const FRAGMENT_URL = '/BYT-SOFTWARE/BYT_SOFTWARE/src/fragments/layout.html';
  const CURRENT_PATH = window.location.pathname;
  const FALLBACK_BACK = '../menu_principal.html';

  // Guarda estilos del head de la página (CSS específicos)
  const pageHeadStyles = Array.from(
    document.head.querySelectorAll('style, link[rel="stylesheet"]')
  ).map(el => el.outerHTML).join('\n');

  // Guarda contenido actual de la página
  const pageContent = document.body.innerHTML;

  // Carga fragmento shell
  const html = await fetch(FRAGMENT_URL).then(r => {
    if (!r.ok) throw new Error(`No se pudo cargar layout: ${r.status}`);
    return r.text();
  });

  // Reemplaza todo el documento por el fragmento
  document.documentElement.innerHTML = html;

  // Restaura estilos específicos de la página
  if (pageHeadStyles) document.head.insertAdjacentHTML('beforeend', pageHeadStyles);

  // Inserta contenido previo en el slot
  const slot = document.getElementById('page-content-slot');
  let wrapper = null;
  if (slot) {
    wrapper = document.createElement('div');
    wrapper.id = 'page-content';
    wrapper.innerHTML = pageContent;
    slot.appendChild(wrapper);
  }

  // Re-ejecuta SOLO scripts inline del contenido original
  function runScripts(root) {
    if (!root) return;
    const scripts = root.querySelectorAll('script');
    scripts.forEach(old => {
      if (old.getAttribute('src')) return; // no duplicar externos
      const s = document.createElement('script');
      for (const { name, value } of Array.from(old.attributes)) s.setAttribute(name, value);
      s.textContent = old.textContent;
      document.body.appendChild(s);
    });
  }
  runScripts(wrapper);

  // Dispara DOMContentLoaded para los listeners de los scripts reinyectados
  setTimeout(() => { document.dispatchEvent(new Event('DOMContentLoaded')); }, 0);

  // Sidebar hover expand/collapse
  const appShell = document.getElementById('appShell');
  const sidebar  = document.querySelector('.sidebar');
  if (appShell && sidebar) {
    sidebar.addEventListener('mouseenter', () => appShell.classList.add('expanded'));
    sidebar.addEventListener('mouseleave', () => appShell.classList.remove('expanded'));
  }

  // --------- Menú dinámico desde window.BYT_MENU ---------
  const menu = Array.isArray(window.BYT_MENU) ? window.BYT_MENU : [];
  const navStack = document.querySelector('.nav-stack');

  const iconMap = {
    folder: `<svg viewBox="0 0 24 24"><path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4.4a1.5 1.5 0 0 1 1.06.44l1.1 1.1H19a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 18.5H5A1.5 1.5 0 0 1 3.5 17V6.5Z"/></svg>`,
    file: `<svg viewBox="0 0 24 24"><path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h5.9a1.5 1.5 0 0 1 1.06.44l3.1 3.1A1.5 1.5 0 0 1 18 7.6V19.5A1.5 1.5 0 0 1 16.5 21h-9A1.5 1.5 0 0 1 6 19.5v-15Z"/><path d="M14.5 3v4a.5.5 0 0 0 .5.5h4"/><path d="M9 13h6M9 16.5h4"/></svg>`,
    cart: `<svg viewBox="0 0 24 24"><path d="M6.5 7h11l-1 11h-9l-1-11Z"/><path d="M9 7V5.5a3 3 0 1 1 6 0V7"/><circle cx="10" cy="19.5" r="1"/><circle cx="15" cy="19.5" r="1"/></svg>`,
    tag: `<svg viewBox="0 0 24 24"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h5.9a1.5 1.5 0 0 1 1.06.44l6.1 6.1a1.5 1.5 0 0 1 0 2.12l-5.5 5.5a1.5 1.5 0 0 1-2.12 0l-6.1-6.1A1.5 1.5 0 0 1 4 11.9V5.5Z"/><circle cx="9" cy="9" r="1.1"/></svg>`,
    card: `<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/><path d="M7 14h3"/></svg>`,
    db: `<svg viewBox="0 0 24 24"><ellipse cx="12" cy="6.5" rx="7.5" ry="3.5"/><path d="M4.5 6.5v11c0 1.93 3.36 3.5 7.5 3.5s7.5-1.57 7.5-3.5v-11"/><path d="M4.5 12c0 1.93 3.36 3.5 7.5 3.5s7.5-1.57 7.5-3.5"/></svg>`,
    gear: `<svg viewBox="0 0 24 24"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.69.05 1.25.61 1.3 1.3V10a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.21 1Z"/></svg>`
  };

  function createNavItem(item, isChild = false, hasChildren = false, opts = {}) {
    const hasHref = !!item.href;
    // Parent headers (with children) render as <div> regardless of href so click can toggle.
    // Leaf items use <a> when there's an href, otherwise <div>.
    const useAnchor = hasHref && !hasChildren;
    const el = document.createElement(useAnchor ? 'a' : 'div');
    el.className = isChild ? 'submenu-link' : 'nav-item';
    if (useAnchor) el.setAttribute('href', item.href);
    // Only mark as disabled when it's a true leaf with no destination and no children.
    if (!hasHref && !hasChildren) el.classList.add('disabled');
    if (hasChildren) el.classList.add('has-children');
    if (opts.protectedGroup) el.setAttribute('data-protected-group', opts.protectedGroup);

    const icon = iconMap[item.icon] || '';
    el.innerHTML = `<span class="nav-icon">${icon}</span><span class="nav-label">${item.label}</span>`;
    return el;
  }

  function renderMenu() {
    if (!navStack) return;
    navStack.innerHTML = '';
    menu.forEach(item => {
      const hasChildren = !!(item.children && item.children.length);
      // Always wrap in .nav-group so CSS rules (hover/open) apply uniformly.
      const group = document.createElement('div');
      group.className = 'nav-group';
      // Detect Finanzas group to mark its links as password-protected.
      const isFinanzas = (item.label || '').trim().toLowerCase() === 'finanzas';
      const childOpts = isFinanzas ? { protectedGroup: 'finanzas' } : {};
      const header = createNavItem(item, false, hasChildren);
      group.appendChild(header);
      if (hasChildren) {
        const submenu = document.createElement('div');
        submenu.className = 'submenu';
        item.children.forEach(ch => submenu.appendChild(createNavItem(ch, true, false, childOpts)));
        group.appendChild(submenu);
        // Click on the parent header toggles open state (works as a fallback to hover).
        header.addEventListener('click', (e) => {
          e.preventDefault();
          // Close other open groups so only one is open at a time.
          navStack.querySelectorAll('.nav-group.open').forEach(g => {
            if (g !== group) g.classList.remove('open');
          });
          group.classList.toggle('open');
        });
      }
      navStack.appendChild(group);
    });
  }
  renderMenu();

  // --------- Protección con clave para módulo Finanzas ---------
  // Intercepta clicks en submenús del grupo Finanzas y exige clave.
  // Sesión válida por 30 minutos vía localStorage.
  const FINANZAS_KEY = 'byt2023L';
  const FINANZAS_TTL_MS = 30 * 60 * 1000;
  const LS_UNLOCKED = 'finanzas_unlocked';
  const LS_UNLOCKED_UNTIL = 'finanzas_unlocked_until';

  function isFinanzasUnlocked() {
    try {
      const flag = localStorage.getItem(LS_UNLOCKED) === 'true';
      const until = parseInt(localStorage.getItem(LS_UNLOCKED_UNTIL) || '0', 10);
      if (!flag || !until) return false;
      if (Date.now() > until) {
        localStorage.removeItem(LS_UNLOCKED);
        localStorage.removeItem(LS_UNLOCKED_UNTIL);
        return false;
      }
      return true;
    } catch { return false; }
  }

  function unlockFinanzas() {
    try {
      localStorage.setItem(LS_UNLOCKED, 'true');
      localStorage.setItem(LS_UNLOCKED_UNTIL, String(Date.now() + FINANZAS_TTL_MS));
    } catch {}
  }

  // Estilos del modal (blur + centrado)
  const finanzasModalStyle = document.createElement('style');
  finanzasModalStyle.textContent = `
    .byt-lock-overlay {
      position: fixed; inset: 0; z-index: 9999;
      display: none; align-items: center; justify-content: center;
      background: rgba(15, 22, 32, 0.45);
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .byt-lock-overlay.show { display: flex; }
    .byt-lock-modal {
      background: #ffffff; color: #2d2d2d;
      width: min(380px, 92vw);
      border-radius: 14px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.28), 0 0 0 1px rgba(0,0,0,0.04);
      padding: 22px 22px 18px;
      font-family: "Inter","SF Pro Display","Roboto",system-ui,sans-serif;
      animation: bytLockIn .18s ease-out;
    }
    @keyframes bytLockIn {
      from { transform: translateY(8px) scale(.98); opacity: 0; }
      to   { transform: translateY(0) scale(1); opacity: 1; }
    }
    .byt-lock-title {
      margin: 0 0 4px; font-size: 17px; font-weight: 700; color: #1f2530;
    }
    .byt-lock-desc {
      margin: 0 0 14px; font-size: 13px; color: #6c7a86;
    }
    .byt-lock-input {
      width: 100%; box-sizing: border-box;
      padding: 10px 12px; font-size: 14px;
      border: 1px solid #e4e7eb; border-radius: 10px;
      background: #f6f7f8; color: #2d2d2d; outline: none;
      transition: border-color .15s ease, background .15s ease;
    }
    .byt-lock-input:focus { border-color: #2e5e4e; background: #fff; }
    .byt-lock-error {
      min-height: 18px; margin: 6px 2px 0;
      color: #c0392b; font-size: 12px; font-weight: 600;
      visibility: hidden;
    }
    .byt-lock-error.show { visibility: visible; }
    .byt-lock-actions {
      display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px;
    }
    .byt-lock-btn {
      border: 1px solid transparent; cursor: pointer;
      padding: 9px 14px; border-radius: 10px;
      font-size: 13px; font-weight: 600;
      transition: background .15s ease, border-color .15s ease, color .15s ease;
    }
    .byt-lock-btn-cancel {
      background: #eef2f5; color: #2d2d2d; border-color: #e4e7eb;
    }
    .byt-lock-btn-cancel:hover { background: #e4e8ec; }
    .byt-lock-btn-ok {
      background: #2e5e4e; color: #fff;
    }
    .byt-lock-btn-ok:hover { background: #264e41; }
  `;
  document.head.appendChild(finanzasModalStyle);

  // Construye el modal una sola vez
  let finanzasModalEls = null;
  function ensureFinanzasModal() {
    if (finanzasModalEls) return finanzasModalEls;
    const overlay = document.createElement('div');
    overlay.className = 'byt-lock-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="byt-lock-modal" role="document">
        <h3 class="byt-lock-title">Acceso a Finanzas</h3>
        <p class="byt-lock-desc">Ingresa la clave para acceder al módulo de Finanzas.</p>
        <input type="password" class="byt-lock-input" placeholder="Clave" autocomplete="off" />
        <div class="byt-lock-error" aria-live="polite">Clave incorrecta. Intenta nuevamente.</div>
        <div class="byt-lock-actions">
          <button type="button" class="byt-lock-btn byt-lock-btn-cancel">Cancelar</button>
          <button type="button" class="byt-lock-btn byt-lock-btn-ok">Confirmar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('.byt-lock-input');
    const errorEl = overlay.querySelector('.byt-lock-error');
    const btnOk = overlay.querySelector('.byt-lock-btn-ok');
    const btnCancel = overlay.querySelector('.byt-lock-btn-cancel');

    finanzasModalEls = { overlay, input, errorEl, btnOk, btnCancel, pending: null };

    function close(result) {
      overlay.classList.remove('show');
      input.value = '';
      errorEl.classList.remove('show');
      const cb = finanzasModalEls.pending;
      finanzasModalEls.pending = null;
      if (cb) cb(result);
    }

    function tryConfirm() {
      if (input.value === FINANZAS_KEY) {
        unlockFinanzas();
        close(true);
      } else {
        errorEl.classList.add('show');
        input.select();
      }
    }

    btnOk.addEventListener('click', tryConfirm);
    btnCancel.addEventListener('click', () => close(false));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
    input.addEventListener('input', () => errorEl.classList.remove('show'));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); tryConfirm(); }
      else if (e.key === 'Escape') { e.preventDefault(); close(false); }
    });

    return finanzasModalEls;
  }

  function askFinanzasKey() {
    const els = ensureFinanzasModal();
    return new Promise(resolve => {
      els.pending = resolve;
      els.overlay.classList.add('show');
      setTimeout(() => els.input.focus(), 30);
    });
  }

  // Intercepta clicks en submenús de Finanzas (delegación en navStack)
  if (navStack) {
    navStack.addEventListener('click', async (e) => {
      const link = e.target.closest('[data-protected-group="finanzas"]');
      if (!link || !navStack.contains(link)) return;
      // Si está deshabilitado, deja que el handler normal lo ignore.
      if (link.classList.contains('disabled')) return;
      if (isFinanzasUnlocked()) return; // ya autorizado, navegación normal

      const href = link.getAttribute('href');
      e.preventDefault();
      e.stopPropagation();

      const ok = await askFinanzasKey();
      if (ok && href) {
        window.location.href = href;
      }
    }, true); // capture: para correr antes que otros listeners
  }

  // Marca activo según URL actual
  function markActive() {
    const links = document.querySelectorAll('.nav-item[href], .submenu a');
    links.forEach(el => {
      el.classList.remove('active');
      const href = el.getAttribute('href') || '';
      if (!href) return;
      const target = href.split('/').pop();
      if (target && CURRENT_PATH.endsWith(target)) {
        el.classList.add('active');
        const parentGroup = el.closest('.nav-group');
        const parentItem = parentGroup?.querySelector('.nav-item');
        parentItem?.classList.add('active');
        // Keep the group open so the active child is visible.
        parentGroup?.classList.add('open');
      }
    });
  }
  markActive();

  // --------- Botón Atrás con pila interna ---------
  const isInternal = url => {
    try {
      const u = new URL(url, window.location.origin);
      return u.origin === window.location.origin;
    } catch { return false; }
  };

  // Guarda última URL interna (referrer) en una pila corta
  const stack = JSON.parse(sessionStorage.getItem('byt_nav_stack') || '[]');
  const ref = document.referrer;
  if (ref && isInternal(ref) && ref !== window.location.href) {
    stack.push(ref);
    while (stack.length > 10) stack.shift();
    sessionStorage.setItem('byt_nav_stack', JSON.stringify(stack));
  }

  function goBack() {
    const bodyBack = document.body?.dataset?.backUrl;
    const winBack = window.BACK_URL;
    if (bodyBack) return window.location.href = bodyBack;
    if (winBack)  return window.location.href = winBack;

    const stackNow = JSON.parse(sessionStorage.getItem('byt_nav_stack') || '[]');
    if (stackNow.length) {
      const last = stackNow.pop();
      sessionStorage.setItem('byt_nav_stack', JSON.stringify(stackNow));
      return window.location.href = last;
    }
    if (ref && isInternal(ref)) {
      return window.location.href = ref;
    }
    return window.location.href = FALLBACK_BACK;
  }

  // Vincula botón atrás
  const backButtons = document.querySelectorAll('[data-back-button], .btn-back, #btn-back');
  backButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      goBack();
    });
  });

  // Estilos mínimos para deshabilitados
  const style = document.createElement('style');
  style.textContent = `
    .nav-item.disabled { cursor: default; opacity: 0.6; pointer-events: none; }
    .submenu-link.disabled { cursor: default; opacity: 0.6; pointer-events: none; }
  `;
  document.head.appendChild(style);
})();
