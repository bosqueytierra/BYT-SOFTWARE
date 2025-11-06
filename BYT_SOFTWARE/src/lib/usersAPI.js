import supabase from './supabaseClient';

// Devuelve arreglo de profiles o lanza error
export async function fetchProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, created_at')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}