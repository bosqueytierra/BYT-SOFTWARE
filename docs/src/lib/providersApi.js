// BYT_SOFTWARE/src/lib/providersApi.js
// Wrapper mínimo para CRUD de providers en Supabase.
// Requiere que window.__SUPABASE_URL y window.__SUPABASE_ANON_KEY estén definidos en la página antes de importar este módulo.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = window.__SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.__SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase URL/ANON KEY no encontrados en window.__SUPABASE_*');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* Providers API */
export async function listProviders({ onlyActive = true } = {}) {
  const q = supabase.from('providers').select('id,name,website,phone,notes,active').order('name', { ascending: true });
  if (onlyActive) q.eq('active', true);
  const { data, error } = await q;
  return { data, error };
}

export async function getProvider(id) {
  const { data, error } = await supabase.from('providers').select('*').eq('id', id).single();
  return { data, error };
}

export async function createProvider(payload) {
  // payload: { name, website?, phone?, notes?, active? }
  const { data, error } = await supabase.from('providers').insert([payload]).select().single();
  return { data, error };
}

export async function updateProvider(id, payload) {
  const { data, error } = await supabase.from('providers').update(payload).eq('id', id).select().single();
  return { data, error };
}

export async function deleteProvider(id) {
  // opcional: soft-delete -> set active = false
  const { data, error } = await supabase.from('providers').update({ active: false }).eq('id', id).select().single();
  return { data, error };
}

// útil para debugging
export function getClient() { return supabase; }
