// Wrapper CRUD para tabla public.materials
// Ruta: BYT_SOFTWARE/src/lib/materialsApi.js
import { supabase } from '../js/supabaseBrowserClient.js';

export async function listMaterials({ onlyActive = true, category = null } = {}) {
  try {
    let q = supabase.from('materials').select('id,name,category,price,unit,notes,active,created_at').order('name', { ascending: true });
    if (onlyActive) q = q.eq('active', true);
    if (category) q = q.eq('category', category);
    const { data, error } = await q;
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getMaterial(id) {
  try {
    const { data, error } = await supabase.from('materials').select('*').eq('id', id).single();
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function createMaterial(payload) {
  try {
    try {
      const s = await supabase.auth.getSession();
      const uid = s?.data?.session?.user?.id;
      if (uid) payload.created_by = uid;
    } catch (e) {
      // ignore
    }
    const { data, error } = await supabase.from('materials').insert([payload]).select().single();
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updateMaterial(id, payload) {
  try {
    const { data, error } = await supabase.from('materials').update(payload).eq('id', id).select().single();
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

export async function deleteMaterial(id, { soft = true } = {}) {
  try {
    if (soft) {
      const { data, error } = await supabase.from('materials').update({ active: false }).eq('id', id).select().single();
      return { data, error };
    } else {
      const { data, error } = await supabase.from('materials').delete().eq('id', id).select().single();
      return { data, error };
    }
  } catch (error) {
    return { data: null, error };
  }
}

export function getClient() {
  return supabase;
}
