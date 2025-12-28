// Inyecta la shell (layout.html) y coloca el contenido de la página en el slot.
(async function() {
  const FRAGMENT_URL = '../fragments/layout.html'; // ajustar si mueves el fragmento
  const CURRENT_PATH = window.location.pathname;

  // Carga fragmento
  const html = await fetch(FRAGMENT_URL).then(r => r.text());
  // Guarda contenido actual de la página (todo el body)
  const pageContent = document.body.innerHTML;

  // Reemplaza body por la shell
  document.documentElement.innerHTML = html;
  // Inserta el contenido previo en el slot
  const slot = document.getElementById('page-content-slot');
  if (slot) {
    const wrapper = document.createElement('div');
    wrapper.id = 'page-content';
    wrapper.innerHTML = pageContent;
    slot.appendChild(wrapper);
  }

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
        // Si está en submenu, marcar también el padre
        const parentGroup = el.closest('.nav-group');
        const parentItem = parentGroup?.querySelector('.nav-item');
        parentItem?.classList.add('active');
      }
    });
  }
  markActive();

  // BYTLoader: si existe, mostrará/ocultará al navegar
  function attachLoader(el) {
    if (!el) return;
    el.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      const href = el.getAttribute('href');
      if (!href) return;
      window.BYTLoader?.show?.();
      setTimeout(() => { window.location.href = href; }, 200);
    });
  }
  document.querySelectorAll('a.nav-item[href], .submenu a[href]').forEach(attachLoader);

  // Oculta loader al cargar
  window.addEventListener('load', () => window.BYTLoader?.hide?.());
})();
