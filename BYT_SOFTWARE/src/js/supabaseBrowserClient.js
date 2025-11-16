// Supabase browser client initializer (módulo ESM)
// - Exporta una binding nombrada `supabase` (live proxy) y también por defecto.
// - Proporciona ensureSupabase() para inicialización asincrónica y getClient() para obtener el cliente actual.
// - Reutiliza window.supabase / window.globalSupabase.client si ya existen.
// - Si hay variables window.SUPABASE_URL y window.SUPABASE_ANON_KEY, intenta crear el cliente automáticamente
//   mediante import dinámico de @supabase/supabase-js desde CDN (útil para entornos estáticos).
//
// Objetivo: evitar que imports como `import { supabase } from './supabaseBrowserClient.js'` devuelvan null,
// y evitar el error "Cannot read properties of null (reading 'from')". Para conseguirlo exportamos un Proxy
// con comportamiento "deferred": si el real client no existe, `supabase.from(...)` devolverá un QueryShim
// thenable que acumula operaciones y las ejecuta cuando el cliente real esté listo. Cuando el cliente real
// esté disponible, las operaciones se ejecutan contra él.

let _realClient = null; // cuando esté disponible, el cliente real
let _initializing = false;

function isValidClient(c) {
  return !!c && typeof c.from === 'function';
}

async function createClientFromEnv() {
  if (typeof window === 'undefined') return null;
  const url = window.SUPABASE_URL || null;
  const key = window.SUPABASE_ANON_KEY || null;
  if (!url || !key) return null;
  try {
    const module = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    const { createClient } = module;
    if (typeof createClient !== 'function') {
      console.warn('[supabaseBrowserClient] createClient no encontrado en el módulo importado');
      return null;
    }
    const client = createClient(url, key, {});
    return client;
  } catch (e) {
    console.error('[supabaseBrowserClient] Error importando supabase-js desde CDN:', e);
    return null;
  }
}

function _exposeRealClient(client) {
  try {
    if (typeof window !== 'undefined') {
      window.supabase = client;
      window.globalSupabase = window.globalSupabase || {};
      window.globalSupabase.client = client;
    }
  } catch (e) {}
}

function _notifyReady() {
  try {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('supabase:ready'));
  } catch (e) {}
}

// Ensure supabase client is available. Returns the real client or null.
export async function ensureSupabase() {
  if (isValidClient(_realClient)) return _realClient;

  if (_initializing) {
    // If another ensureSupabase is running, wait until it completes
    let attempts = 0;
    while (_initializing && attempts++ < 50) {
      await new Promise(r => setTimeout(r, 100));
    }
    return _realClient;
  }

  _initializing = true;
  try {
    // 1) Check global
    try {
      if (typeof window !== 'undefined') {
        if (isValidClient(window.supabase)) _realClient = window.supabase;
        else if (window.globalSupabase && isValidClient(window.globalSupabase.client)) _realClient = window.globalSupabase.client;
      }
    } catch (e) {}

    if (isValidClient(_realClient)) {
      _exposeRealClient(_realClient);
      _notifyReady();
      return _realClient;
    }

    // 2) Try create from env
    const created = await createClientFromEnv();
    if (isValidClient(created)) {
      _realClient = created;
      _exposeRealClient(_realClient);
      _notifyReady();
      console.log('[supabaseBrowserClient] supabase inicializado y expuesto en window.supabase');
      return _realClient;
    }

    // 3) Not available yet
    return null;
  } finally {
    _initializing = false;
  }
}

export function getClient() {
  return _realClient;
}

// QueryShim: acumula operaciones y se ejecuta cuando existe el cliente real.
class QueryShim {
  constructor(table) {
    this._table = table;
    this._ops = []; // [{ method, args }]
    this._thenPromise = null;
  }

  _push(method, args) {
    this._ops.push({ method, args });
    return this;
  }

  select(...args) { return this._push('select', args); }
  eq(...args) { return this._push('eq', args); }
  ilike(...args) { return this._push('ilike', args); }
  order(...args) { return this._push('order', args); }
  range(...args) { return this._push('range', args); }
  update(...args) { return this._push('update', args); }
  insert(...args) { return this._push('insert', args); }
  delete(...args) { return this._push('delete', args); }
  single(...args) { return this._push('single', args); }
  limit(...args) { return this._push('limit', args); }

  // Execute the accumulated ops against the real client when ready
  _executeAgainstReal() {
    if (!this._thenPromise) {
      this._thenPromise = (async () => {
        const client = await ensureSupabase();
        if (!isValidClient(client)) {
          throw new Error('Supabase client not initialized');
        }
        let q = client.from(this._table);
        for (const op of this._ops) {
          const fn = q[op.method];
          if (typeof fn !== 'function') {
            throw new Error(`Query builder method not supported: ${op.method}`);
          }
          q = fn.apply(q, op.args);
        }
        // q is expected to be a PostgrestQueryBuilder or Promise-like
        return await q;
      })();
    }
    return this._thenPromise;
  }

  then(onFulfilled, onRejected) {
    return this._executeAgainstReal().then(onFulfilled, onRejected);
  }

  catch(onRejected) { return this._executeAgainstReal().catch(onRejected); }
  finally(onFinally) { return this._executeAgainstReal().finally(onFinally); }
}

// auth shim to support supabase.auth.getSession() used in code
const authShim = {
  async getSession() {
    const client = await ensureSupabase();
    if (!client || !client.auth || typeof client.auth.getSession !== 'function') {
      return { data: { session: null }, error: new Error('Auth not available') };
    }
    return client.auth.getSession();
  },
  // Provide a fallback signIn/signOut stub if needed later
  async signIn() { throw new Error('Auth signIn not available'); },
  async signOut() { throw new Error('Auth signOut not available'); }
};

// Build the exported proxy object
export const supabase = new Proxy({}, {
  get(_, prop) {
    // If real client exists, forward directly
    if (isValidClient(_realClient)) {
      const val = _realClient[prop];
      if (typeof val === 'function') return val.bind(_realClient);
      return val;
    }

    // Provide core behaviors before real client exists
    if (prop === 'from') {
      return (table) => new QueryShim(table);
    }
    if (prop === 'auth') {
      return authShim;
    }
    if (prop === 'ensureSupabase') {
      return ensureSupabase;
    }
    if (prop === 'getClient' || prop === 'get') {
      return getClient;
    }

    // Return undefined for other props (consumer should call ensureSupabase in that case)
    return undefined;
  },

  set(_, prop, value) {
    // If real client exists, set it there; otherwise no-op
    if (isValidClient(_realClient)) {
      try { _realClient[prop] = value; } catch (e) {}
    }
    return true;
  },

  has(_, prop) {
    if (prop === 'from' || prop === 'auth' || prop === 'ensureSupabase' || prop === 'getClient') return true;
    return isValidClient(_realClient) ? prop in _realClient : false;
  }
});

// autoInit (non-blocking)
(async function autoInit() {
  try {
    if (typeof window !== 'undefined' && isValidClient(window.supabase)) {
      _realClient = window.supabase;
      _exposeRealClient(_realClient);
      _notifyReady();
      console.log('[supabaseBrowserClient] window.supabase ya inicializado (reuse).');
      return;
    }
    const created = await createClientFromEnv();
    if (isValidClient(created)) {
      _realClient = created;
      _exposeRealClient(_realClient);
      _notifyReady();
      console.log('[supabaseBrowserClient] supabase inicializado con credenciales encontradas en window.');
      return;
    }
    console.log('[supabaseBrowserClient] supabase no inicializado automáticamente (no detectado en window y no hay credenciales).');
  } catch (err) {
    console.error('[supabaseBrowserClient] autoInit error:', err);
  }
})();

// default export for backward compat
export default supabase;
