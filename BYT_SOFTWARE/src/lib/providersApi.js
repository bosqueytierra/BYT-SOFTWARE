// BYT_SOFTWARE/src/lib/providersApi.js
// Wrapper mínimo para CRUD de providers usando el cliente navegador (supabaseBrowserClient)

import { supabase } from '../js/supabaseBrowserClient.js';

/* Providers API */
export async function listProviders({ onlyActive = true } = {}) {
  try {
    let q = supabase.from('providers').select('id,name,website,phone,notes,active').order('name', { ascending: true });
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

export async function deleteProvider(id) {
  try {
    // Soft-delete por defecto: marcar active = false
    const { data, error } = await supabase.from('providers').update({ active: false }).eq('id', id).select().single();
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export function getClient() {
  return supabase;
}
