// Supabase browser client initializer (módulo ESM)
// - Exporta una binding nombrada `supabase` (live binding) y también por defecto.
// - Proporciona ensureSupabase() para inicialización asincrónica y getClient() para obtener el cliente actual.
// - Reutiliza window.supabase / window.globalSupabase.client si ya existen.
// - Si hay variables window.SUPABASE_URL y window.SUPABASE_ANON_KEY, intenta crear el cliente automáticamente
//   mediante import dinámico de @supabase/supabase-js desde CDN (útil para entornos estáticos).
//
// Reemplaza/coloca este archivo antes de cualquier módulo que haga `import { supabase } from './supabaseBrowserClient.js'`
// para asegurar que la exportación exista y se actualice cuando el cliente esté listo.

export let supabase = null;

function isValidClient(c) {
  return c && typeof c.from === 'function';
}

async function createClientFromEnv() {
  if (typeof window === 'undefined') return null;

  const url = window.SUPABASE_URL || null;
  const key = window.SUPABASE_ANON_KEY || null;
  if (!url || !key) return null;

  try {
    // Cargar ESM desde CDN (jsDelivr) y crear cliente
    const module = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    const { createClient } = module;
    if (typeof createClient !== 'function') {
      console.warn('[supabaseBrowserClient] createClient no encontrado en el módulo importado');
      return null;
    }
    const client = createClient(url, key, {
      // Opciones por defecto; se pueden ajustar si hace falta.
      // fetch: window.fetch
    });
    return client;
  } catch (e) {
    console.error('[supabaseBrowserClient] Error importando supabase-js desde CDN:', e);
    return null;
  }
}

/**
 * ensureSupabase - intenta garantizar que exista un cliente supabase funcional.
 * - Reusa window.supabase o window.globalSupabase.client si ya existen.
 * - Si no existen, intenta crear uno si hay credenciales en window.
 * - Devuelve el cliente o null si no pudo obtenerlo.
 */
export async function ensureSupabase() {
  // 1) Si ya hay binding válido
  if (isValidClient(supabase)) return supabase;

  // 2) Verificar window (otro script pudo haberlo creado)
  try {
    if (typeof window !== 'undefined') {
      if (isValidClient(window.supabase)) {
        supabase = window.supabase;
      } else if (window.globalSupabase && isValidClient(window.globalSupabase.client)) {
        supabase = window.globalSupabase.client;
      }
    }
  } catch (e) {
    // ignore
  }
  if (isValidClient(supabase)) {
    // asegurar exposición global consistente
    try {
      if (typeof window !== 'undefined') {
        window.supabase = supabase;
        window.globalSupabase = window.globalSupabase || {};
        window.globalSupabase.client = supabase;
      }
    } catch (e) {}
    // notify listeners
    try { if (typeof window !== 'undefined') window.dispatchEvent(new Event('supabase:ready')); } catch (_) {}
    return supabase;
  }

  // 3) Intentar crear cliente desde env/browser variables
  const created = await createClientFromEnv();
  if (isValidClient(created)) {
    supabase = created;
    try {
      if (typeof window !== 'undefined') {
        window.supabase = supabase;
        window.globalSupabase = window.globalSupabase || {};
        window.globalSupabase.client = supabase;
      }
    } catch (e) {}
    try { if (typeof window !== 'undefined') window.dispatchEvent(new Event('supabase:ready')); } catch (_) {}
    console.log('[supabaseBrowserClient] supabase inicializado y expuesto en window.supabase');
    return supabase;
  }

  // 4) No se pudo obtener cliente
  return null;
}

/** getClient - devuelve el cliente actual (posible null). */
export function getClient() {
  return supabase;
}

// Inicialización automática no bloqueante: intentar tomar cliente global o crear si hay credenciales.
// No lanzamos errores hacia afuera; solo intentamos dejar supabase disponible lo antes posible.
(async function autoInit() {
  try {
    // Si ya existe window.supabase y es válido, úsalo.
    if (typeof window !== 'undefined' && isValidClient(window.supabase)) {
      supabase = window.supabase;
      // Asegurar globalSupabase
      window.globalSupabase = window.globalSupabase || {};
      window.globalSupabase.client = window.supabase;
      try { window.dispatchEvent(new Event('supabase:ready')); } catch (e) {}
      console.log('[supabaseBrowserClient] window.supabase ya inicializado (reuse).');
      return;
    }

    // Si no existe, intentar crear si hay SUPABASE_URL/ANON_KEY
    const maybe = await createClientFromEnv();
    if (isValidClient(maybe)) {
      supabase = maybe;
      try {
        if (typeof window !== 'undefined') {
          window.supabase = supabase;
          window.globalSupabase = window.globalSupabase || {};
          window.globalSupabase.client = supabase;
        }
      } catch (e) {}
      try { if (typeof window !== 'undefined') window.dispatchEvent(new Event('supabase:ready')); } catch (e) {}
      console.log('[supabaseBrowserClient] supabase inicializado con credenciales encontradas en window.');
      return;
    }

    // Si aún no hay cliente, solo registramos que la inicialización quedó pendiente.
    console.log('[supabaseBrowserClient] supabase no inicializado automáticamente (no detectado en window y no hay credenciales).');
  } catch (err) {
    console.error('[supabaseBrowserClient] autoInit error:', err);
  }
})();

// También intentamos exponer un pequeño helper global para compatibilidad con código antiguo
try {
  if (typeof window !== 'undefined') {
    window.globalSupabase = window.globalSupabase || {};
    // No sobrescribimos si ya existe
    if (!isValidClient(window.globalSupabase.client) && isValidClient(supabase)) {
      window.globalSupabase.client = supabase;
    }
  }
} catch (e) { /* ignore */ }

// Export por defecto (binding live) para compatibilidad con import default.
export default supabase;
