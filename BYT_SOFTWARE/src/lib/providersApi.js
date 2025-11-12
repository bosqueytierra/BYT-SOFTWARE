// Wrapper CRUD para tabla public.providers
// Ruta: BYT_SOFTWARE/src/lib/providersApi.js
// Importa el cliente browser-ready
import { supabase } from '../js/supabaseBrowserClient.js';

export async function listProviders({ onlyActive = true } = {}) {
  try {
    let q = supabase.from('providers').select('id,name,website,phone,notes,active,created_at').order('name', { ascending: true });
    if (onlyActive) q = q.eq('active', true);
    const { data, error } = await q;
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getProvider(id) {
  try {
    const { data, error } = await supabase.from('providers').select('*').eq('id', id).single();
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function createProvider(payload) {
  try {
    // intentar añadir created_by si hay sesión activa
    try {
      const s = await supabase.auth.getSession();
      const uid = s?.data?.session?.user?.id;
      if (uid) payload.created_by = uid;
    } catch (e) {
      // ignorar si no se puede obtener sesión
    }
    const { data, error } = await supabase.from('providers').insert([payload]).select().single();
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updateProvider(id, payload) {
  try {
    const { data, error } = await supabase.from('providers').update(payload).eq('id', id).select().single();
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function deleteProvider(id, { soft = true } = {}) {
  try {
    if (soft) {
      // marcar como inactivo
      const { data, error } = await supabase.from('providers').update({ active: false }).eq('id', id).select().single();
      return { data, error };
    } else {
      const { data, error } = await supabase.from('providers').delete().eq('id', id).select().single();
      return { data, error };
    }
  } catch (error) {
    return { data: null, error };
  }
}

export function getClient() {
  return supabase;
}
