// opcional: exponer helpers para testing en dev
import supabase from './supabaseClient';

if (typeof window !== 'undefined') {
  window.supabaseClient = window.supabaseClient || {};
  window.supabaseClient.supabase = supabase;
  window.supabaseClient.testLogin = async (email = 'user@example.com', password = 'password') =>
    supabase.auth.signInWithPassword({ email, password });
  window.supabaseClient.validarConexion = async () =>
    supabase.from('profiles').select('*', { count: 'exact' }).limit(1);
}