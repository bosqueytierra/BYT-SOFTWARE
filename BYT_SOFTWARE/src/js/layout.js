// Inyecta la shell (layout.html), coloca el contenido de la página en el slot
// y re-ejecuta únicamente los scripts inline de la página (evita reinyectar scripts externos para no duplicar).
(async function() {
  // Evita doble inyección si el script se corre más de una vez.
  if (window.__BYT_SHELL_APPLIED__) return;
  window.__BYT_SHELL_APPLIED__ = true;

  const FRAGMENT_URL = '/BYT-SOFTWARE/BYT_SOFTWARE/src/fragments/layout.html';
  const CURRENT_PATH = window.location.pathname;

  // Guarda estilos del head de la página (para no perder CSS específico)
  const pageHeadStyles = Array.from(
    document.head.querySelectorAll('style, link[rel="stylesheet"]')
  ).map(el => el.outerHTML).join('\n');

  // Guarda contenido actual de la página (todo el body)
  const pageContent = document.body.innerHTML;

  // Carga fragmento
  const html = await fetch(FRAGMENT_URL).then(r => {
    if (!r.ok) throw new Error(`No se pudo cargar layout: ${r.status}`);
    return r.text();
  });

  // Reemplaza body por la shell
  document.documentElement.innerHTML = html;

  // Restaura los estilos específicos de la página
  if (pageHeadStyles) {
    document.head.insertAdjacentHTML('beforeend', pageHeadStyles);
  }

  // Inserta el contenido previo en el slot
  const slot = document.getElementById('page-content-slot');
  let wrapper = null;
  if (slot) {
    wrapper = document.createElement('div');
    wrapper.id = 'page-content';
    wrapper.innerHTML = pageContent;
    slot.appendChild(wrapper);
  }

  // Re-ejecuta SOLO scripts inline del contenido, saltando layout.js y cualquier script con src
  function runScripts(root) {
    if (!root) return;
    const scripts = root.querySelectorAll('script');
    scripts.forEach(old => {
      const src = old.getAttribute('src') || '';
      // Evita recursión y evita duplicar scripts externos
      if (src) return;
      const s = document.createElement('script');
      for (const { name, value } of Array.from(old.attributes)) {
        s.setAttribute(name, value);
      }
      s.textContent = old.textContent;
      document.body.appendChild(s);
    });
  }
  runScripts(wrapper);

  // Dispara DOMContentLoaded para que corran los listeners añadidos en los scripts reinyectados
  setTimeout(() => {
    document.dispatchEvent(new Event('DOMContentLoaded'));
  }, 0);

  // Sidebar hover expand/collapse
  const appShell = document.getElementById('appShell');
  const sidebar  = document.querySelector('.sidebar');
  if (appShell && sidebar) {
    sidebar.addEventListener('mouseenter', () => appShell.classList.add('expanded'));
    sidebar.addEventListener('mouseleave', () => appShell.classList.remove('expanded'));
  }

  // Marca activo según URL
  function markActive() {
    const links = document.querySelectorAll('.nav-item, .submenu a');
    links.forEach(el => {
      el.classList.remove('active');
      const href = el.getAttribute('href') || '';
      if (href && CURRENT_PATH.endsWith(href.split('/').pop())) {
        el.classList.add('active');
        const parentGroup = el.closest('.nav-group');
        const parentItem = parentGroup?.querySelector('.nav-item');
        parentItem?.classList.add('active');
      }
    });
  }
  markActive();

  // Loader eliminado: no attachLoader, no BYTLoader.show/hide
})();
