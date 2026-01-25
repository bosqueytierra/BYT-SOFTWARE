// Inyecta la shell y aplica menú unificado desde window.BYT_MENU
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

  function createNavItem(item, isChild = false) {
    const hasHref = !!item.href;
    const el = document.createElement(hasHref ? 'a' : 'div');
    el.className = isChild ? 'submenu-link' : 'nav-item';
    if (hasHref) el.setAttribute('href', item.href);
    else el.classList.add('disabled');

    const icon = iconMap[item.icon] || '';
    el.innerHTML = `<span class="nav-icon">${icon}</span><span class="nav-label">${item.label}</span>`;
    return el;
  }

  function renderMenu() {
    if (!navStack) return;
    navStack.innerHTML = '';
    menu.forEach(item => {
      if (item.children && item.children.length) {
        const group = document.createElement('div');
        group.className = 'nav-group';
        const header = createNavItem(item, false);
        group.appendChild(header);
        const submenu = document.createElement('div');
        submenu.className = 'submenu';
        item.children.forEach(ch => submenu.appendChild(createNavItem(ch, true)));
        group.appendChild(submenu);
        navStack.appendChild(group);
      } else {
        navStack.appendChild(createNavItem(item, false));
      }
    });
  }
  renderMenu();

  // Marca activo según URL actual
  function markActive() {
    const links = document.querySelectorAll('.nav-item[href], .submenu a');
    links.forEach(el => {
      el.classList.remove('active');
      const href = el.getAttribute('href') || '';
      if (!href) return;
      const target = href.split('/').pop();
      if (CURRENT_PATH.endsWith(target)) {
        el.classList.add('active');
        const parentGroup = el.closest('.nav-group');
        const parentItem = parentGroup?.querySelector('.nav-item');
        parentItem?.classList.add('active');
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
