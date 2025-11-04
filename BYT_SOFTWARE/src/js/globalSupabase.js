import { supabase } from '../supabaseClient.js';
import { createClient } from '@supabase/supabase-js';

/**
 * Global Supabase API functions for the application
 * Uses the canonical singleton from src/supabaseClient.js
 */

// ===== FUNCIONES DE PRUEBA =====
/**
 * Prueba rápida de login con email/password.
 * Por defecto usa:
 *  email: luiscarvajal@bosqueytierra.cl
 *  pass:  mono123mono
 *
 * Retorna el objeto respuesta de Supabase.
 */
async function testLogin(email = 'luiscarvajal@bosqueytierra.cl', password = 'mono123mono') {
  try {
    const res = await supabase.auth.signInWithPassword({ email, password });
    console.log('testLogin response:', res);
    return res;
  } catch (err) {
    console.error('testLogin error:', err);
    return { error: err };
  }
}

// Validar conexión simple (consulta ligera)
async function validarConexionSupabase() {
  try {
    const { data, error } = await supabase
      .from('cotizaciones')
      .select('*', { count: 'exact' })
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    console.log('validarConexionSupabase OK');
    return { success: true, data };
  } catch (err) {
    console.error('Error de conexión con Supabase:', err);
    return { success: false, error: err };
  }
}

// ===== FUNCIONES DE COTIZACIONES (misma API que tenías) =====
async function guardarCotizacion(datosCompletos) {
  try {
    const { data, error } = await supabase
      .from('cotizaciones')
      .insert([{
        nombre_proyecto: datosCompletos.cliente.nombre_proyecto,
        cliente: datosCompletos.cliente.nombre,
        direccion: datosCompletos.cliente.direccion,
        encargado: datosCompletos.cliente.encargado,
        notas: datosCompletos.cliente.notas,

        quincalleria: JSON.stringify(datosCompletos.materiales.quincalleria || {}),
        tableros: JSON.stringify(datosCompletos.materiales.tableros || {}),
        tapacantos: JSON.stringify(datosCompletos.materiales.tapacantos || {}),
        corte: JSON.stringify(datosCompletos.materiales.corte || {}),
        madera: JSON.stringify(datosCompletos.materiales.madera || {}),
        led: JSON.stringify(datosCompletos.materiales.led || {}),

        fierro: datosCompletos.valoresTraspasados.fierro || 0,
        cuarzo: datosCompletos.valoresTraspasados.cuarzo || 0,
        ventanas: datosCompletos.valoresTraspasados.ventanas || 0,
        transporte: datosCompletos.valoresTraspasados.transporte || 0,
        almuerzo: datosCompletos.valoresTraspasados.almuerzo || 0,
        extras: JSON.stringify(datosCompletos.valoresTraspasados.extras || {}),

        total_materiales: datosCompletos.totales.totalMateriales,
        factor: datosCompletos.totales.factor,
        total_neto: datosCompletos.totales.totalNeto,
        iva: datosCompletos.totales.iva,
        total_proyecto: datosCompletos.totales.totalProyecto,
        ganancia: datosCompletos.totales.ganancia,

        created_at: new Date().toISOString()
      }]);

    if (error) throw error;
    console.log('Cotización guardada exitosamente:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error al guardar cotización:', error);
    return { success: false, error: error.message || error };
  }
}

async function obtenerCotizaciones() {
  try {
    const { data, error } = await supabase
      .from('cotizaciones')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error al obtener cotizaciones:', error);
    return { success: false, error: error.message || error };
  }
}

async function obtenerCotizacionPorId(id) {
  try {
    const { data, error } = await supabase
      .from('cotizaciones')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error al obtener cotización:', error);
    return { success: false, error: error.message || error };
  }
}

async function actualizarCotizacion(id, datosActualizados) {
  try {
    const { data, error } = await supabase
      .from('cotizaciones')
      .update(datosActualizados)
      .eq('id', id);

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error al actualizar cotización:', error);
    return { success: false, error: error.message || error };
  }
}

async function eliminarCotizacion(id) {
  try {
    const { data, error } = await supabase
      .from('cotizaciones')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error al eliminar cotización:', error);
    return { success: false, error: error.message || error };
  }
}

// ===== TEST FUNCTION WITH CUSTOM CREDENTIALS =====
/**
 * Test function to create a temporary client with custom credentials
 * for manual testing without changing the global client
 * 
 * @param {string} url - Custom Supabase URL
 * @param {string} anonKey - Custom Supabase ANON KEY
 * @param {string} email - Email for authentication test
 * @param {string} password - Password for authentication test
 * @returns {Promise} Test result
 */
async function testWithCustom(url, anonKey, email, password) {
  try {
    console.log('Testing with custom credentials:', { url, email });
    const tempClient = createClient(url, anonKey);
    const res = await tempClient.auth.signInWithPassword({ email, password });
    console.log('testWithCustom response:', res);
    return res;
  } catch (err) {
    console.error('testWithCustom error:', err);
    return { error: err };
  }
}

// ===== FUNCIONES DE UTILIDAD =====
function mostrarNotificacion(mensaje, tipo = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${tipo}`;
  notification.textContent = mensaje;

  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    transition: all 0.3s ease;
    transform: translateX(100%);
  `;

  switch (tipo) {
    case 'success': notification.style.background = '#4caf50'; break;
    case 'error': notification.style.background = '#f44336'; break;
    case 'warning': notification.style.background = '#ff9800'; break;
    default: notification.style.background = '#2196f3';
  }

  document.body.appendChild(notification);

  setTimeout(() => { notification.style.transform = 'translateX(0)'; }, 100);
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => { if (notification.parentNode) document.body.removeChild(notification); }, 300);
  }, 3000);
}

// ===== EXPORT GLOBAL PARA PRUEBAS Y USO EN LA APP =====
window.supabaseClient = {
  // pruebas rápidas
  testLogin,
  validarConexionSupabase,
  testWithCustom,

  // CRUD cotizaciones
  guardarCotizacion,
  obtenerCotizaciones,
  obtenerCotizacionPorId,
  actualizarCotizacion,
  eliminarCotizacion
};

window.utils = { mostrarNotificacion };
