import { supabase } from '../supabaseClient';

/**
 * Mantener la API antigua expuesta en window.supabaseClient para compatibilidad.
 * No crear new createClient aquí; siempre usar el singleton importado.
 */

// Funciones de ejemplo (adáptalas si ya tenías las tuyas)
async function guardarCotizacion(datosCompletos) {
  try {
    const { data, error } = await supabase.from('cotizaciones').insert([{
      // transforma y mapea campos según tu esquema
      ...datosCompletos,
      created_at: new Date().toISOString()
    }]);
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message || error };
  }
}

async function obtenerCotizaciones() {
  try {
    const { data, error } = await supabase.from('cotizaciones').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message || error };
  }
}

async function obtenerCotizacionPorId(id) {
  try {
    const { data, error } = await supabase.from('cotizaciones').select('*').eq('id', id).single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message || error };
  }
}

async function actualizarCotizacion(id, datosActualizados) {
  try {
    const { data, error } = await supabase.from('cotizaciones').update(datosActualizados).eq('id', id);
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message || error };
  }
}

async function eliminarCotizacion(id) {
  try {
    const { data, error } = await supabase.from('cotizaciones').delete().eq('id', id);
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message || error };
  }
}

async function validarConexion() {
  try {
    const { data, error } = await supabase.from('cotizaciones').select('*', { count: 'exact' }).limit(1);
    if (error && error.code !== 'PGRST116') throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message || error };
  }
}

// Permitir pruebas puntuales sin tocar el singleton
async function testWithCustom(url, anonKey, email, password) {
  try {
    const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    const tmp = mod.createClient(url, anonKey);
    const res = await tmp.auth.signInWithPassword({ email, password });
    return res;
  } catch (err) {
    return { error: err };
  }
}

window.supabaseClient = {
  guardarCotizacion,
  obtenerCotizaciones,
  obtenerCotizacionPorId,
  actualizarCotizacion,
  eliminarCotizacion,
  validarConexion,
  testWithCustom
};
window.utils = { mostrarNotificacion };

