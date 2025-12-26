(function() {
  const overlayId = 'byt-loader-overlay';
  const GIF_SRC = "https://bosqueytierra.github.io/BYT-SOFTWARE/BYT_SOFTWARE/src/assets/img/Cargando.gif";

  function ensureOverlay() {
    let ov = document.getElementById(overlayId);
    if (ov) return ov;

    ov = document.createElement('div');
    ov.id = overlayId;
    ov.className = 'byt-loader-overlay hidden';
    ov.innerHTML = `
      <div class="byt-loader-card">
        <div class="byt-loader-animation">
          <img src="${GIF_SRC}" alt="Cargando..." style="width:160px;height:120px;object-fit:contain;" />
        </div>
        <div class="byt-loader-text">Cargando...</div>
      </div>
    `;
    document.body.appendChild(ov);
    return ov;
  }

  const Loader = {
    show() {
      const ov = ensureOverlay();
      ov.classList.remove('hidden');
      ov.style.display = 'flex';
    },
    hide() {
      const ov = document.getElementById(overlayId);
      if (!ov) return;
      ov.classList.add('hidden');
      ov.style.display = 'none';
    }
  };

  window.BYTLoader = Loader;
})();
