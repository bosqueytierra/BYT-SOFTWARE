// BYT_SOFTWARE/src/lib/providersApi.js
// Wrapper mínimo para CRUD de providers usando el cliente canonical en src/supabaseClient.js

// Importar el cliente singleton que ya existe en tu repo.
// Usamos la ruta absoluta que coincide con GitHub Pages deploy: ajusta si tu estructura es distinta.
import { supabase } from '/BYT_SOFTWARE/src/supabaseClient.js';

// Providers API
export async function listProviders({ onlyActive = true } = {}) {
  const query = supabase.from('providers').select('id,name,website,phone,notes,active').order('name', { ascending: true });
  if (onlyActive) query.eq('active', true);
  const { data, error } = await query;
  return { data, error };
}

export async function getProvider(id) {
  const { data, error } = await supabase.from('providers').select('*').eq('id', id).single();
  return { data, error };
}

export async function createProvider(payload) {
  const { data, error } = await supabase.from('providers').insert([payload]).select().single();
  return { data, error };
}

export async function updateProvider(id, payload) {
  const { data, error } = await supabase.from('providers').update(payload).eq('id', id).select().single();
  return { data, error };
}

export async function deleteProvider(id) {
  // Soft-delete: marcar como inactive
  const { data, error } = await supabase.from('providers').update({ active: false }).eq('id', id).select().single();
  return { data, error };
}

// para debugging
export function getClient() { return supabase; }
