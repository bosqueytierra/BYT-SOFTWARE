// Wrapper CRUD para tabla public.providers
// Ruta: BYT_SOFTWARE/src/lib/providersApi.js
// Ahora espera explícitamente a que exista un cliente Supabase real (ensureSupabase).
// Si no hay cliente disponible devuelve un error { data: null, error } evitando que la app se rompa.
// Además: NOTIFICA globalmente (window.dispatchEvent) cuando una mutación termina OK,
// despachando 'providers:changed' con detalle { action, id, row } para que consumidores (wizard) se actualicen.

import { supabase, ensureSupabase, getClient } from '../js/supabaseBrowserClient.js';

/**
 * Obtiene el cliente real (no el proxy) o devuelve error si no está inicializado.
 * Retorna: { client, error }
 */
async function _getRealClientOrError() {
  // Intentar asegurar la inicialización
  const client = await ensureSupabase();
  if (client && typeof client.from === 'function') return { client, error: null };

  // Si ensureSupabase no pudo obtener cliente, devolver error controlado
  return { client: null, error: new Error('no-supabase') };
}

// Internal helper: dispatch providers:changed safely
function _dispatchProvidersChanged(payload = {}) {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('providers:changed', { detail: payload }));
    }
  } catch (e) {
    console.warn('providersApi: dispatch providers:changed failed', e);
  }
}

// List providers
export async function listProviders({ onlyActive = true } = {}) {
  try {
    const { client, error } = await _getRealClientOrError();
    if (error) return { data: null, error };

    let q = client.from('providers').select('id,name,website,phone,notes,active,created_at').order('name', { ascending: true });
    if (onlyActive) q = q.eq('active', true);
    const { data, error: qerr } = await q;
    return { data, error: qerr };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getProvider(id) {
  try {
    const { client, error } = await _getRealClientOrError();
    if (error) return { data: null, error };

    const { data, error: qerr } = await client.from('providers').select('*').eq('id', id).single();
    return { data, error: qerr };
  } catch (error) {
    return { data: null, error };
  }
}

export async function createProvider(payload) {
  try {
    const { client, error } = await _getRealClientOrError();
    if (error) return { data: null, error };

    // intentar añadir created_by si hay sesión activa
    try {
      const userResp = await client.auth.getSession();
      const uid = userResp?.data?.session?.user?.id;
      if (uid) payload.created_by = uid;
    } catch (e) {
      // ignorar si no se puede obtener sesión
    }

    const { data, error: qerr } = await client.from('providers').insert([payload]).select().single();
    if (!qerr && data) {
      // Notificar cambios globalmente
      _dispatchProvidersChanged({ action: 'create', id: data.id, row: data });
    }
    return { data, error: qerr };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updateProvider(id, payload) {
  try {
    const { client, error } = await _getRealClientOrError();
    if (error) return { data: null, error };

    const { data, error: qerr } = await client.from('providers').update(payload).eq('id', id).select().single();
    if (!qerr && data) {
      _dispatchProvidersChanged({ action: 'update', id: data.id, row: data });
    }
    return { data, error: qerr };
  } catch (error) {
    return { data: null, error };
  }
}

export async function deleteProvider(id, { soft = true } = {}) {
  try {
    const { client, error } = await _getRealClientOrError();
    if (error) return { data: null, error };

    if (soft) {
      // marcar como inactivo
      const { data, error: qerr } = await client.from('providers').update({ active: false }).eq('id', id).select().single();
      if (!qerr && data) {
        _dispatchProvidersChanged({ action: 'soft-delete', id: data.id, row: data });
      }
      return { data, error: qerr };
    } else {
      const { data, error: qerr } = await client.from('providers').delete().eq('id', id).select().single();
      if (!qerr && data) {
        _dispatchProvidersChanged({ action: 'delete', id: data.id, row: data });
      }
      return { data, error: qerr };
    }
  } catch (error) {
    return { data: null, error };
  }
}

export function getClientExport() {
  // devuelve el cliente real (o null) de forma síncrona
  return getClient();
}
