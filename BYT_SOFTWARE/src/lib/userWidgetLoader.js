// BYT_SOFTWARE/src/lib/userWidgetLoader.js
// Loader simple: importa el renderizador y lo ejecuta.

import { renderUserHeader } from '/BYT-SOFTWARE/src/lib/userWidget.js';

// Renderiza el header en el div#siteHeader por defecto
renderUserHeader('siteHeader').catch(console.error);
