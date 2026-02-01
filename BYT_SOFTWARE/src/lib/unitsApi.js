import { supabase } from '../js/supabaseBrowserClient.js';

export async function listUnits({ onlyActive = true } = {}) {
  let q = supabase.from('units').select('id,code,name,active').order('name',{ascending:true});
  if (onlyActive) q = q.eq('active', true);
  const { data, error } = await q;
  return { data, error };
}

export async function createUnit(payload) {
  const { data, error } = await supabase.from('units').insert([payload]).select().single();
  return { data, error };
}

export async function updateUnit(id, payload) {
  const { data, error } = await supabase.from('units').update(payload).eq('id', id).select().single();
  return { data, error };
}

export async function deleteUnit(id, { soft = true } = {}) {
  if (soft) return updateUnit(id, { active: false });
  const { data, error } = await supabase.from('units').delete().eq('id', id).select().single();
  return { data, error };
}

export function getClient() { return supabase; }
