import { supabase } from '../js/supabaseBrowserClient.js';

const BUCKET = 'category-images';

export async function listCategoriesWithImages() {
  const { data, error } = await supabase
    .from('material_categories')
    .select('name,image_url')
    .order('name');
  return { data, error };
}

export async function upsertCategoryImage({ name, file }) {
  if (!name || !file) return { error: 'Falta name o file' };
  const slug = slugify(name);
  const ext = (file.name?.split('.').pop() || 'webp').toLowerCase();
  const path = `${slug}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || 'image/webp' });
  if (upErr) return { error: upErr };

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const image_url = pub?.publicUrl;

  const { data, error } = await supabase
    .from('material_categories')
    .upsert({ name, image_url })
    .select()
    .single();
  return { data, error };
}

export async function removeCategoryImage(name) {
  if (!name) return { error: 'Falta name' };

  const { data: row } = await supabase
    .from('material_categories')
    .select('image_url')
    .eq('name', name)
    .maybeSingle();

  if (row?.image_url) {
    const key = row.image_url.split('/').slice(-1)[0];
    await supabase.storage.from(BUCKET).remove([key]);
  }

  const { data, error } = await supabase
    .from('material_categories')
    .update({ image_url: null })
    .eq('name', name)
    .select()
    .single();
  return { data, error };
}

function slugify(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}
