// Punto de entrada para Vercel - Versión adaptada para serverless
const fs = require('fs');
const path = require('path');
const url = require('url');

// MIME types para diferentes archivos
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css', 
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Función serverless compatible con Vercel
module.exports = (req, res) => {
  try {
    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname;

    // Si es la raíz, servir index.html
    if (pathname === '/') {
      pathname = '/index.html';
    }

    // Construir la ruta del archivo
    let filePath = path.join(__dirname, pathname);

    // Si no tiene extensión y no existe, intentar con .html
    if (!path.extname(filePath) && !fs.existsSync(filePath)) {
      filePath = filePath + '.html';
    }

    // Verificar si el archivo existe
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      
      if (stat.isFile()) {
        const ext = path.extname(filePath);
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    }

    // Archivo no encontrado
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>BYT SOFTWARE - 404</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error { color: #e74c3c; }
          .back { margin-top: 20px; }
          .back a { color: #3498db; text-decoration: none; }
        </style>
      </head>
      <body>
        <h1 class="error">404 - Página no encontrada</h1>
        <p>La página solicitada no existe en BYT SOFTWARE.</p>
        <div class="back">
          <a href="/">&larr; Volver al inicio</a>
        </div>
      </body>
      </html>
    `);
    
  } catch (error) {
    console.error('Error en servidor:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Error interno del servidor');
  }
};
