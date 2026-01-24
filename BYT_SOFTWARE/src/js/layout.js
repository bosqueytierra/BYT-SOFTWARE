// Inyecta la shell y aplica menú unificado desde window.BYT_MENU (no docs)
(async function() {
  if (window.__BYT_SHELL_APPLIED__) return;
  window.__BYT_SHELL_APPLIED__ = true;

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
    folder: '📁',
    file: '📄',
    cart: '🛒',
    tag: '🏷️',
    card: '💳',
    db: '🗂️',
    gear: '⚙️'
  };

  function createNavItem(item, isChild = false) {
    const hasHref = !!item.href;
    const el = document.createElement(hasHref ? 'a' : 'div');
    el.className = isChild ? 'submenu-link' : 'nav-item';
    if (hasHref) el.setAttribute('href', item.href);
    else el.classList.add('disabled'); // sin ruta, deshabilitado

    const icon = iconMap[item.icon] || '•';
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
