import { supabase } from '../js/supabaseBrowserClient.js';

const BUCKET = 'category-images';

export async function listCategoriesWithImages() {
  const { data, error } = await supabase
    .from('material_categories')
    .select('name,image_url')
    .order('name');
  return { data, error };
}

/**
 * Crea/actualiza categoría. El archivo es opcional.
 * - Si hay file: sube a storage y guarda image_url.
 * - Si no hay file: solo crea/upserta la fila con image_url null.
 */
export async function upsertCategoryImage({ name, file }) {
  if (!name) return { error: 'Falta name' };

  let image_url = null;

  if (file) {
    const slug = slugify(name);
    const ext = (file.name?.split('.').pop() || 'webp').toLowerCase();
    const path = `${slug}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type || 'image/webp' });
    if (upErr) return { error: upErr };

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    image_url = pub?.publicUrl || null;
  }

  const { data, error } = await supabase
    .from('material_categories')
    .upsert({ name, image_url })
    .select()
    .single();

  return { data, error };
}

/**
 * Quita la imagen (y opcionalmente borra el archivo del bucket si existía).
 */
export async function removeCategoryImage(name) {
  if (!name) return { error: 'Falta name' };

  const { data: row } = await supabase
    .from('material_categories')
    .select('image_url')
    .eq('name', name)
    .maybeSingle();

  if (row?.image_url) {
    try {
      const url = new URL(row.image_url);
      const key = url.pathname.split('/').slice(4).join('/'); // bucket path after /storage/v1/object/public/
      if (key) await supabase.storage.from(BUCKET).remove([key]);
    } catch (e) {
      console.warn('No se pudo derivar key de image_url', e);
    }
  }

  const { data, error } = await supabase
    .from('material_categories')
    .upsert({ name, image_url: null })
    .select()
    .single();

  return { data, error };
}

export async function renameCategory({ oldName, newName }) {
  if (!oldName || !newName) return { error: 'Faltan nombres' };
  const { error } = await supabase
    .from('material_categories')
    .update({ name: newName })
    .eq('name', oldName);
  return { data: !error, error };
}

export async function deleteCategory(name) {
  if (!name) return { error: 'Falta name' };
  const { data, error } = await supabase
    .from('material_categories')
    .delete()
    .eq('name', name);
  return { data, error };
}


function slugify(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}
