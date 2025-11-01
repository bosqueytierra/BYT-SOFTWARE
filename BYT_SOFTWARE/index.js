// API handler para funciones dinámicas
module.exports = (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  
  // Respuesta simple para confirmar que funciona
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    message: 'BYT SOFTWARE API funcionando',
    path: pathname,
    timestamp: new Date().toISOString()
  });
};
