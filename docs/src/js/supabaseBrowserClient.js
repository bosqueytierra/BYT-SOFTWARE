// Supabase browser client initializer (módulo ESM)
// - Exporta una binding nombrada `supabase` (live binding) y también por defecto.
// - Proporciona ensureSupabase() para inicialización asincrónica y getClient() para obtener el cliente actual.
// - Reutiliza window.supabase / window.globalSupabase.client si ya existen.
// - Si hay variables window.SUPABASE_URL y window.SUPABASE_ANON_KEY, intenta crear el cliente automáticamente
//   mediante import dinámico de @supabase/supabase-js desde CDN (útil para entornos estáticos).
//
// IMPORTANT: Este archivo ahora también exporta un "shim" inteligente como `supabase` que permite que
// otros módulos (que llaman `supabase.from(...).select(...).order(...); const { data, error } = await q;`)
// funcionen incluso si el cliente real aún no se ha inicializado. El shim construye la cadena de
// operaciones y, cuando se awaited (then), llama al cliente real y ejecuta la consulta.
//
// Reemplaza/coloca este archivo antes de cualquier módulo que haga `import { supabase } from './supabaseBrowserClient.js'`
// para asegurar que la exportación exista y se actualice cuando el cliente esté listo.

let _realClient = null; // internal real supabase client when available

function isValidClient(c) {
  return c && typeof c.from === 'function';
}

async function createClientFromEnv() {
  if (typeof window === 'undefined') return null;

  const url = window.SUPABASE_URL || null;
  const key = window.SUPABASE_ANON_KEY || null;
  if (!url || !key) return null;

  try {
    // Cargar ESM desde CDN (jsDelivr) y crear cliente
    const module = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    const { createClient } = module;
    if (typeof createClient !== 'function') {
      console.warn('[supabaseBrowserClient] createClient no encontrado en el módulo importado');
      return null;
    }
    const client = createClient(url, key, {
      // Opciones por defecto; se pueden ajustar si hace falta.
      // fetch: window.fetch
    });
    return client;
  } catch (e) {
    console.error('[supabaseBrowserClient] Error importando supabase-js desde CDN:', e);
    return null;
  }
}

/**
 * ensureSupabase - intenta garantizar que exista un cliente supabase funcional.
 * - Reusa window.supabase o window.globalSupabase.client si ya existen.
 * - Si no existen, intenta crear uno si hay credenciales en window.
 * - Devuelve el cliente o null si no pudo obtenerlo.
 */
export async function ensureSupabase() {
  // 1) Si ya hay binding válido
  if (isValidClient(_realClient)) return _realClient;

  // 2) Verificar window (otro script pudo haberlo creado)
  try {
    if (typeof window !== 'undefined') {
      if (isValidClient(window.supabase)) {
        _realClient = window.supabase;
      } else if (window.globalSupabase && isValidClient(window.globalSupabase.client)) {
        _realClient = window.globalSupabase.client;
      }
    }
  } catch (e) {
    // ignore
  }
  if (isValidClient(_realClient)) {
    _exposeRealClient(_realClient);
    _notifyReady();
    return _realClient;
  }

  // 3) Intentar crear cliente desde env/browser variables
  const created = await createClientFromEnv();
  if (isValidClient(created)) {
    _realClient = created;
    _exposeRealClient(_realClient);
    _notifyReady();
    console.log('[supabaseBrowserClient] supabase inicializado y expuesto en window.supabase');
    return _realClient;
  }

  // 4) No se pudo obtener cliente
  return null;
}

/** getClient - devuelve el cliente actual (posible null). */
export function getClient() {
  return _realClient;
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

/**
 * QueryShim: construye una cadena de operaciones (select, eq, order, update, insert, delete, etc.)
 * y es thenable. Cuando se hace `await shim` se espera until real client exists y luego ejecuta:
 *   real = client.from(table)
 *   real = real[method](...args) for each op
 *   return await real
 *
 * Esto permite que módulos que importan `supabase` y llaman a `supabase.from(...).select(...).order(...)`
 * funcionen incluso si el cliente real aún no está listo.
 */
class QueryShim {
  constructor(table) {
    this._table = table;
    this._ops = []; // { method, args }
    this._single = false;
    this._thenable = null;
  }

  // generic op recorder
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
  single(...args) { this._single = true; return this._push('single', args); }
  // allow additional methods if needed
  limit(...args) { return this._push('limit', args); }
  // ... add more as required

  // Implement then/catch/finally to be a proper thenable
  then(onFulfilled, onRejected) {
    // create a promise that executes the recorded ops against the real client
    if (!this._thenable) {
      this._thenable = (async () => {
        // wait for real client
        const client = await ensureSupabase();
        if (!isValidClient(client)) {
          throw new Error('Supabase client not initialized');
        }

        // build the real query
        let q = client.from(this._table);
        for (const op of this._ops) {
          // guard: some op names might not exist on builder; try/catch
          try {
            const m = q[op.method];
            if (typeof m === 'function') {
              q = m.apply(q, op.args);
            } else {
              // If method not available, skip (or throw)
              throw new Error(`Method ${op.method} not found on query builder`);
            }
          } catch (e) {
            // If it's a terminal op like insert/update/delete that returns a Promise, call it and return
            // But we prefer to bubble up the error
            throw e;
          }
        }

        // q should now be a PostgrestQueryBuilder or Promise-like. Await it.
        return await q;
      })();
    }
    return this._thenable.then(onFulfilled, onRejected);
  }

  catch(onRejected) {
    return this.then(undefined, onRejected);
  }

  finally(onFinally) {
    // ensure thenable exists and attach finally
    const p = this.then();
    return p.finally(onFinally);
  }
}

/**
 * Simple auth shim that defers to real client when available.
 * Currently implements getSession() which providersApi uses.
 */
const authShim = {
  async getSession() {
    const client = await ensureSupabase();
    if (!client || !client.auth || typeof client.auth.getSession !== 'function') {
      return { data: { session: null }, error: new Error('Auth not available') };
    }
    return client.auth.getSession();
  },
  // add other auth methods as needed, deferred similarly
};

/**
 * supabaseProxy: objeto exportado como `supabase`.
 * - from(table) => QueryShim
 * - auth => authShim
 * - getClient() => real client if available (synchronous)
 *
 * This proxy ensures code that imports `{ supabase }` gets an object that responds
 * to supabase.from(...).select(...).then(...) even before the real client is ready.
 */
export const supabase = new Proxy({}, {
  get(_, prop) {
    if (prop === 'from') {
      return (table) => new QueryShim(table);
    }
    if (prop === 'auth') {
      return authShim;
    }
    if (prop === 'getClient' || prop === 'get') {
      return getClient;
    }
    if (prop === 'ensureSupabase') {
      return ensureSupabase;
    }
    // If real client exists and prop exists on it, return bound function or value
    if (isValidClient(_realClient)) {
      const val = _realClient[prop];
      if (typeof val === 'function') return val.bind(_realClient);
      return val;
    }
    // otherwise return undefined or noop
    return undefined;
  },
  set(_, prop, value) {
    // allow setting on proxy (no-op) but if real client exists set there
    if (isValidClient(_realClient)) {
      try {
        _realClient[prop] = value;
      } catch (e) {}
    }
    return true;
  },
  has(_, prop) {
    if (prop === 'from' || prop === 'auth' || prop === 'ensureSupabase' || prop === 'getClient') return true;
    return isValidClient(_realClient) ? prop in _realClient : false;
  }
});

// Auto-init: try to obtain client ASAP without blocking importers.
// This will set _realClient if environment variables exist or if window.supabase already provided.
(async function autoInit() {
  try {
    // If already present globally, reuse it
    if (typeof window !== 'undefined' && isValidClient(window.supabase)) {
      _realClient = window.supabase;
      _exposeRealClient(_realClient);
      _notifyReady();
      console.log('[supabaseBrowserClient] window.supabase ya inicializado (reuse).');
      return;
    }

    // Attempt create from env
    const maybe = await createClientFromEnv();
    if (isValidClient(maybe)) {
      _realClient = maybe;
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

// Also try to keep window.globalSupabase.client consistent if real client becomes available later.
// When ensureSupabase() finally creates the client it will call _exposeRealClient/_notifyReady.

// Default export for compatibility
export default supabase;
