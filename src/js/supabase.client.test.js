// Test helpers para probar lock / upsert / subscribe / upload
import { supabase } from '../supabaseClient.js';

// Obtener usuario actual (si ya estás logueado en la app)
async function currentUserId(){
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
}

// Adquirir lock (RPC)
export async function tryAcquireLock(quoteId, ttlSeconds = 300) {
  const user = await currentUserId();
  if(!user) { console.warn('No user logged'); return; }
  const { data, error } = await supabase.rpc('acquire_quote_lock', { p_quote: quoteId, p_user: user, p_ttl_seconds: ttlSeconds });
  return { acquired: data, error };
}

// Liberar lock
export async function tryReleaseLock(quoteId) {
  const user = await currentUserId();
  const { data, error } = await supabase.rpc('release_quote_lock', { p_quote: quoteId, p_user: user });
  return { released: data, error };
}

// Upsert quote (guardar cambios)
export async function upsertQuote(payload) {
  // payload: must include id if update
  const { data, error } = await supabase.from('quotes').upsert(payload).select();
  return { data, error };
}

// Suscripción realtime a cambios en quotes
export function subscribeToQuotes(onEvent) {
  const channel = supabase
    .channel('public:quotes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes' }, (payload) => {
      onEvent(payload);
    })
    .subscribe();
  return channel;
}

// Upload a attachments bucket (ejemplo)
export async function uploadAttachment(quoteId, file) {
  // file: File object (input type=file)
  const path = `quotes/${quoteId}/${Date.now()}_${file.name}`;
  const { data, error } = await supabase.storage.from('attachments').upload(path, file, { upsert: true });
  if (error) return { error };
  // Get public URL (if bucket public) or signed URL (if private)
  const { data: urlData, error: urlError } = await supabase.storage.from('attachments').getPublicUrl(path);
  return { data, url: urlData?.publicUrl, error: urlError };
}