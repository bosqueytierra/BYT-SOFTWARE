// Exponer una API ligera en window.supabaseClient que re-use el singleton
import { supabase } from '../supabaseClient';

window.supabaseClient = window.supabaseClient || {};

// expone el objeto supabase si alguien lo necesita
window.supabaseClient.supabase = supabase;

// funciones utilitarias compatibles con código existente
window.supabaseClient.testLogin = async (email = 'luiscarvajal@bosqueytierra.cl', password = 'mono123mono') => {
  try {
    const res = await supabase.auth.signInWithPassword({ email, password });
    console.log('testLogin res:', res);
    return res;
  } catch (err) {
    console.error('testLogin error:', err);
    return { error: err };
  }
};

window.supabaseClient.validarConexion = async () => {
  try {
    const { data, error } = await supabase.from('cotizaciones').select('*', { count: 'exact' }).limit(1);
    if (error && error.code !== 'PGRST116') throw error;
    console.log('validarConexion OK', { data });
    return { success: true, data };
  } catch (err) {
    console.error('validarConexion error:', err);
    return { success: false, error: err };
  }
};

// API adicional de compatibilidad (si hay código antiguo que llamaba estas funciones)
window.supabaseClient.testWithCustom = async (url, anonKey, email, password) => {
  try {
    const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    const tmp = mod.createClient(url, anonKey);
    const r = await tmp.auth.signInWithPassword({ email, password });
    return r;
  } catch (e) {
    console.error('testWithCustom error:', e);
    return { error: e };
  }
};
