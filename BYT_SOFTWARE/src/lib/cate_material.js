import { supabase } from '../js/supabaseBrowserClient.js';

const BUCKET = 'category-images';

export async function listCategoriesWithImages() {
  const { data, error } = await supabase
    .from('material_categories')
    .select('name,image_url,updated_at,created_at')
    .order('name');
  return { data, error };
}

/**
 * Crea/actualiza categoría. El archivo es opcional.
 */
export async function upsertCategoryImage({ name, file }) {
  if (!name) return { error: 'Falta name' };

  let image_url = null;

  if (file) {
    const slug = slugify(name);
    const ext = (file.name?.split('.').pop() || 'webp').toLowerCase();
    // Path único con timestamp para evitar colisiones de cache de Storage/CDN
    const path = `${slug}/cover-${Date.now()}.${ext}`;

    // Borrar imagen anterior del bucket (si existe) para no acumular archivos huérfanos
    try {
      const { data: prevRow } = await supabase
        .from('material_categories')
        .select('image_url')
        .eq('name', name)
        .maybeSingle();
      if (prevRow?.image_url) {
        const prevKey = extractStorageKey(prevRow.image_url);
        if (prevKey) {
          try { await supabase.storage.from(BUCKET).remove([prevKey]); }
          catch (e) { console.warn('No se pudo borrar imagen anterior', e); }
        }
      }
    } catch (e) {
      console.warn('No se pudo consultar imagen anterior', e);
    }

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

export async function removeCategoryImage(name) {
  if (!name) return { error: 'Falta name' };

  const { data: row } = await supabase
    .from('material_categories')
    .select('image_url')
    .eq('name', name)
    .maybeSingle();

  if (row?.image_url) {
    const key = extractStorageKey(row.image_url);
    try {
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

/**
 * Elimina la fila de la categoría en el catálogo.
 */
export async function deleteCategory(name) {
  if (!name) return { error: 'Falta name' };
  const { data, error } = await supabase
    .from('material_categories')
    .delete()
    .eq('name', name);
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

function slugify(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/**
 * Deriva la key (path dentro del bucket) a partir de una public URL de Supabase Storage.
 * Soporta paths antiguos planos (`slug.ext`) y nuevos con subcarpeta (`slug/cover-*.ext`).
 */
function extractStorageKey(publicUrl) {
  if (!publicUrl) return null;
  try {
    const u = new URL(publicUrl);
    const marker = `/object/public/${BUCKET}/`;
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(u.pathname.slice(idx + marker.length));
  } catch (e) {
    return null;
  }
}
