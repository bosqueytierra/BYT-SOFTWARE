// Requiere supabase ya inicializado (supabaseBrowserClient)
export async function crearBloqueComprasDesdeCotizacion(cot) {
  const proyecto_id = cot.id || cot.cotizacion_id || cot.proyecto_id || null;
  const proyecto_nombre =
    cot.nombre_proyecto ||
    cot.project_key ||
    cot.data?.cliente?.nombre_proyecto ||
    cot.data?.cliente?.nombre ||
    'Proyecto';

  const total_cotizado = Number(cot.total_proyecto || cot.total || 0);
  const total_cobrado  = Number(cot.total_cobrado || cot.total_venta || 0);

  // ¿Existe bloque ya?
  const { data: existing, error: errFind } = await supabase
    .from('purchase_blocks')
    .select('*')
    .eq('proyecto_id', proyecto_id)
    .maybeSingle();
  if (errFind) throw errFind;
  if (existing) return { data: existing, error: null };

  const { data, error } = await supabase
    .from('purchase_blocks')
    .insert([{
      proyecto_id,
      proyecto_nombre,
      total_cotizado,
      total_cobrado,
      estado: 'en_compra',
    }])
    .select('*')
    .single();
  return { data, error };
}

export async function listarBloquesCompras() {
  const { data, error } = await supabase
    .from('purchase_blocks')
    .select('*')
    .order('created_at', { ascending: false });
  return { data, error };
}

export async function listarLineasCompra(blockId) {
  const { data, error } = await supabase
    .from('purchase_lines')
    .select('*')
    .eq('block_id', blockId)
    .order('created_at', { ascending: true });
  return { data, error };
}

export async function crearLineaCompra(blockId, payload) {
  const { data, error } = await supabase
    .from('purchase_lines')
    .insert([{ ...payload, block_id: blockId }])
    .select('*')
    .single();
  return { data, error };
}

export async function actualizarLineaCompra(id, patch) {
  const { data, error } = await supabase
    .from('purchase_lines')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  return { data, error };
}

export async function eliminarLineaCompra(id) {
  const { error } = await supabase
    .from('purchase_lines')
    .delete()
    .eq('id', id);
  return { error };
}
