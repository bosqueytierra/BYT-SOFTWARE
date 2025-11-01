const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8000;

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

const server = http.createServer((req, res) => {
  let parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;
  
  // Si es la raíz, redirigir a index.html
  if (pathname === '/') {
    pathname = '/index.html';
  }
  
  // Construir ruta completa del archivo
  let filePath = path.join(__dirname, pathname);
  
  // Verificar si el archivo existe
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // Archivo no encontrado
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>404 - No encontrado</title>
        </head>
        <body>
          <h1>404 - Archivo no encontrado</h1>
          <p>El archivo <strong>${pathname}</strong> no existe.</p>
          <a href="/">Ir al inicio</a>
        </body>
        </html>
      `);
      return;
    }
    
    // Obtener extensión del archivo
    let ext = path.extname(filePath).toLowerCase();
    let contentType = mimeTypes[ext] || 'application/octet-stream';
    
    // Leer y servir el archivo
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>500 - Error del servidor</title>
          </head>
          <body>
            <h1>500 - Error interno del servidor</h1>
            <p>No se pudo leer el archivo.</p>
          </body>
          </html>
        `);
        return;
      }
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
});

server.listen(PORT, () => {
  console.log(`🚀 BYT SOFTWARE iniciado en:`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Red:     http://192.168.1.x:${PORT}`);
  console.log(`\n📁 Sirviendo archivos desde: ${__dirname}`);
  console.log(`⏰ Iniciado el: ${new Date().toLocaleString('es-ES')}`);
  console.log(`\n🔗 Para acceder al sistema, abra:`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`\n⏹️  Para detener el servidor: Ctrl+C`);
});

// Manejar cierre del servidor
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Cerrando servidor BYT SOFTWARE...');
  console.log('✅ Servidor cerrado correctamente');
  process.exit(0);
});