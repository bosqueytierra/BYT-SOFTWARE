// Supabase browser client initializer (módulo ESM)
// - Exporta una binding nombrada `supabase` (proxy inmediato) y también por defecto.
// - Proporciona ensureSupabase() para inicialización asincrónica y getClient() para obtener el cliente actual.
// - Reutiliza window.supabase / window.globalSupabase.client si ya existen.
// - Si hay variables window.SUPABASE_URL y window.SUPABASE_ANON_KEY, intenta crear el cliente automáticamente
//   mediante import dinámico de @supabase/supabase-js desde CDN (útil para entornos estáticos).
//
// IMPORTANT: Este archivo EXPLÍCITAMENTE exporta un `supabase` Proxy *inmediatamente* al inicio para
// evitar que otros módulos reciban `null`. Ese proxy implementa .from(...) devolviendo un QueryShim
// thenable que espera la inicialización real del cliente (si hace falta) antes de ejecutar la consulta.
//
// Reemplaza este archivo en BYT_SOFTWARE/src/js/supabaseBrowserClient.js por completo.

let _realClient = null;       // el cliente real cuando esté disponible
let _initializing = false;    // bandera para prevent race
let _autoInitTried = false;

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

/** Ensure supabase: intenta garantizar que exista un cliente supabase funcional. */
export async function ensureSupabase() {
  if (isValidClient(_realClient)) return _realClient;

  if (_initializing) {
    // esperar a que acabe la inicialización que otro caller está haciendo
    let attempts = 0;
    while (_initializing && attempts++ < 100) {
      await new Promise(r => setTimeout(r, 50));
    }
    return _realClient;
  }

  _initializing = true;
  try {
    // 1) Verificar si ya existe globalmente
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

    // 2) Intentar crear desde variables de entorno/browser
    const created = await createClientFromEnv();
    if (isValidClient(created)) {
      _realClient = created;
      _exposeRealClient(_realClient);
      _notifyReady();
      console.log('[supabaseBrowserClient] supabase inicializado y expuesto en window.supabase');
      return _realClient;
    }

    // 3) Si no hay cliente, devolver null - el QueryShim esperará cuando se use
    return null;
  } finally {
    _initializing = false;
  }
}

export function getClient() {
  return _realClient;
}

// QueryShim: acumula operaciones y las ejecuta cuando el cliente real esté listo.
class QueryShim {
  constructor(table) {
    this._table = table;
    this._ops = []; // { method, args }
    this._promise = null;
  }

  _push(method, args) {
    this._ops.push({ method, args });
    return this;
  }

  // Métodos comunes usados en el repo (añadir si necesitas otros)
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

  async _exec() {
    if (!this._promise) {
      this._promise = (async () => {
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
        // Ejecutar la query y devolver el resultado
        return await q;
      })();
    }
    return this._promise;
  }

  then(onFulfilled, onRejected) {
    return this._exec().then(onFulfilled, onRejected);
  }
  catch(onRejected) { return this._exec().catch(onRejected); }
  finally(onFinally) { return this._exec().finally(onFinally); }
}

// Auth shim: soporta getSession() usado en createProvider
const authShim = {
  async getSession() {
    const client = await ensureSupabase();
    if (!client || !client.auth || typeof client.auth.getSession !== 'function') {
      return { data: { session: null }, error: new Error('Auth not available') };
    }
    return client.auth.getSession();
  },
  // stubs: lanzan error si se usan antes de inicializar real client
  async signIn() { const c = await ensureSupabase(); if (!isValidClient(c)) throw new Error('Auth not available'); return c.auth.signIn(); },
  async signOut() { const c = await ensureSupabase(); if (!isValidClient(c)) throw new Error('Auth not available'); return c.auth.signOut(); }
};

// Export named `supabase` IMMEDIATELY como Proxy para evitar que otros módulos obtengan null.
// Este proxy soporta:
// - supabase.from(table).select(...).eq(...).then(...)  -> QueryShim thenable
// - supabase.auth.getSession() -> deferred authShim
// - supabase.ensureSupabase -> exported ensureSupabase
export const supabase = new Proxy({}, {
  get(_, prop) {
    // Si existe cliente real, devolver directamente su miembro
    if (isValidClient(_realClient)) {
      const val = _realClient[prop];
      if (typeof val === 'function') return val.bind(_realClient);
      return val;
    }
    // Antes de que exista el cliente, exponer behaviors mínimos
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
    // Otros miembros devuelven undefined; consumers deben usar ensureSupabase
    return undefined;
  },
  set(_, prop, value) {
    // si ya hay real client, setear en él; si no, no-op
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

// AutoInit (no bloqueante) — intentamos detectar o crear cliente si las credenciales están disponibles.
(async function autoInit() {
  try {
    if (_autoInitTried) return;
    _autoInitTried = true;

    // Reusar si otro script ya expuso window.supabase
    if (typeof window !== 'undefined' && isValidClient(window.supabase)) {
      _realClient = window.supabase;
      _exposeRealClient(_realClient);
      _notifyReady();
      console.log('[supabaseBrowserClient] window.supabase ya inicializado (reuse).');
      return;
    }

    // Intentar crear si hay credenciales en window
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

// Mantener compatibilidad: export default también disponible
export default supabase;
