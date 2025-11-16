// Supabase browser client — robust initializer and runtime shim
// - Exports a named `supabase` binding immediately (Proxy) so imports never get `null`.
// - Exports default `supabase` as well for compatibility.
// - Exports ensureSupabase(timeoutMs) and getClient() helpers.
// - Strategy:
//   1) Try reuse window.supabase or window.globalSupabase.client if already created by other script (preferred).
//   2) If window.SUPABASE_URL and window.SUPABASE_ANON_KEY are present, create client via dynamic import of @supabase/supabase-js.
//   3) Otherwise do not hard-fail: provide a Proxy/QueryShim so callers that do `supabase.from(...).select(...).then(...)` won't throw — the shim will wait until a real client becomes available (via ensureSupabase or window.dispatched event 'supabase:ready') and then execute the recorded query.
//   4) When a real client becomes available we expose it on window.supabase and dispatch 'supabase:ready'.
// Notes:
// - This file is defensive: it avoids the "Cannot read properties of null (reading 'from')" error by always exporting a usable object.
// - Consumers should prefer calling ensureSupabase() when they need to guarantee a real client synchronously available before running queries (providersApi was updated accordingly).
// - If you want to force immediate initialization, set window.SUPABASE_URL and window.SUPABASE_ANON_KEY BEFORE loading this script (or set them in a small inline script tag).

let _realClient = null;
let _initializing = false;
let _autoInitAttempted = false;

// Small util
function isValidClient(c) {
  return !!c && typeof c.from === 'function';
}

// Try to create a client from environment-like variables on window.
// Returns client or null.
async function _createClientFromWindowEnv() {
  if (typeof window === 'undefined') return null;
  const url = window.SUPABASE_URL || null;
  const key = window.SUPABASE_ANON_KEY || null;
  if (!url || !key) return null;

  try {
    const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    const { createClient } = mod;
    if (typeof createClient !== 'function') {
      console.warn('[supabaseBrowserClient] createClient not found in imported module');
      return null;
    }
    const client = createClient(url, key, {
      // Optionally set fetch or other options here
      // fetch: window.fetch
    });
    return client;
  } catch (e) {
    console.error('[supabaseBrowserClient] error importing supabase-js:', e);
    return null;
  }
}

function _exposeClientGlobally(client) {
  try {
    if (typeof window !== 'undefined') {
      window.supabase = client;
      window.globalSupabase = window.globalSupabase || {};
      window.globalSupabase.client = client;
    }
  } catch (e) {
    // ignore
  }
}

function _dispatchReady() {
  try {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('supabase:ready'));
  } catch (e) { /* ignore */ }
}

// ensureSupabase: attempts to guarantee a real client exists within timeoutMs.
// - If client already exists returns it.
// - Otherwise it will attempt to create from window env immediately.
// - Then will wait for event 'supabase:ready' or window.supabase to appear up to timeoutMs.
// - Returns client or null if unavailable after timeout.
export async function ensureSupabase(timeoutMs = 5000) {
  if (isValidClient(_realClient)) return _realClient;

  if (_initializing) {
    // wait for initialization by another caller
    const start = Date.now();
    while (_initializing && (Date.now() - start) < timeoutMs) {
      await new Promise(r => setTimeout(r, 100));
    }
    return isValidClient(_realClient) ? _realClient : null;
  }

  _initializing = true;
  try {
    // 1) check already on window
    try {
      if (typeof window !== 'undefined') {
        if (isValidClient(window.supabase)) {
          _realClient = window.supabase;
        } else if (window.globalSupabase && isValidClient(window.globalSupabase.client)) {
          _realClient = window.globalSupabase.client;
        }
      }
    } catch (e) { /* ignore */ }

    if (isValidClient(_realClient)) {
      _exposeClientGlobally(_realClient);
      _dispatchReady();
      return _realClient;
    }

    // 2) attempt to create from window env now
    const created = await _createClientFromWindowEnv();
    if (isValidClient(created)) {
      _realClient = created;
      _exposeClientGlobally(_realClient);
      _dispatchReady();
      console.log('[supabaseBrowserClient] supabase initialized from window env and exposed globally');
      return _realClient;
    }

    // 3) no immediate client -> wait for possible external initializer or event within timeout
    const start = Date.now();
    let resolved = false;
    const promise = new Promise((resolve) => {
      const onReady = () => {
        if (resolved) return;
        resolved = true;
        cleanup();
        // prefer window.supabase if available
        try {
          if (isValidClient(window.supabase)) {
            _realClient = window.supabase;
          } else if (window.globalSupabase && isValidClient(window.globalSupabase.client)) {
            _realClient = window.globalSupabase.client;
          }
        } catch (e) {}
        resolve(isValidClient(_realClient) ? _realClient : null);
      };
      const cleanup = () => {
        try { window.removeEventListener('supabase:ready', onReady); } catch (e) {}
        clearInterval(poller);
        clearTimeout(timeoutId);
      };
      // listen event
      try { window.addEventListener('supabase:ready', onReady); } catch (e) {}
      // poller in case other script sets window.supabase without firing event
      const poller = setInterval(() => {
        try {
          if (isValidClient(window.supabase) || (window.globalSupabase && isValidClient(window.globalSupabase.client))) {
            onReady();
          }
        } catch (e) {}
      }, 200);

      const timeoutId = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(null);
      }, timeoutMs);
    });

    const client = await promise;
    if (client && isValidClient(client)) {
      _realClient = client;
      _exposeClientGlobally(_realClient);
      return _realClient;
    }
    return null;
  } finally {
    _initializing = false;
  }
}

export function getClient() {
  return _realClient;
}

// QueryShim: record method calls and run them when a real client becomes available.
class QueryShim {
  constructor(table) {
    this._table = table;
    this._ops = []; // sequence of { method, args }
    this._promise = null;
  }

  _push(method, args) {
    this._ops.push({ method, args });
    return this;
  }

  // Common methods used in repo
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
        const client = await ensureSupabase(10000); // wait a bit longer if necessary
        if (!isValidClient(client)) throw new Error('Supabase client not initialized');
        let q = client.from(this._table);
        for (const op of this._ops) {
          const fn = q[op.method];
          if (typeof fn !== 'function') throw new Error(`Query method not supported: ${op.method}`);
          q = fn.apply(q, op.args);
        }
        return await q;
      })();
    }
    return this._promise;
  }

  then(onFulfilled, onRejected) { return this._exec().then(onFulfilled, onRejected); }
  catch(onRejected) { return this._exec().catch(onRejected); }
  finally(onFinally) { return this._exec().finally(onFinally); }
}

// Minimal auth shim deferring to real client when available.
const authShim = {
  async getSession() {
    const client = await ensureSupabase();
    if (!client || !client.auth || typeof client.auth.getSession !== 'function') {
      return { data: { session: null }, error: new Error('Auth not available') };
    }
    return client.auth.getSession();
  },
  async signIn(...args) {
    const client = await ensureSupabase();
    if (!client || !client.auth || typeof client.auth.signIn !== 'function') throw new Error('Auth not available');
    return client.auth.signIn(...args);
  },
  async signOut(...args) {
    const client = await ensureSupabase();
    if (!client || !client.auth || typeof client.auth.signOut !== 'function') throw new Error('Auth not available');
    return client.auth.signOut(...args);
  }
};

// Exported proxy object `supabase` available immediately.
export const supabase = new Proxy({}, {
  get(_, prop) {
    // If real client exists, forward directly
    if (isValidClient(_realClient)) {
      const val = _realClient[prop];
      if (typeof val === 'function') return val.bind(_realClient);
      return val;
    }
    // Provide helpful behaviours before client exists
    if (prop === 'from') return (table) => new QueryShim(table);
    if (prop === 'auth') return authShim;
    if (prop === 'ensureSupabase') return ensureSupabase;
    if (prop === 'getClient' || prop === 'get') return getClient;
    // otherwise undefined (callers should call ensureSupabase first)
    return undefined;
  },
  set(_, prop, value) {
    if (isValidClient(_realClient)) {
      try { _realClient[prop] = value; } catch (e) {}
    }
    return true;
  },
  has(_, prop) {
    if (prop === 'from' || prop === 'auth' || prop === 'ensureSupabase') return true;
    return isValidClient(_realClient) ? prop in _realClient : false;
  }
});

// Automatic best-effort initialization (non-blocking):
// Try to reuse an existing window.supabase; if none, attempt to create from env on window
(async function _autoInit() {
  if (_autoInitAttempted) return;
  _autoInitAttempted = true;

  try {
    // reuse window.supabase if present
    if (typeof window !== 'undefined') {
      try {
        if (isValidClient(window.supabase)) {
          _realClient = window.supabase;
          _exposeClientGlobally(_realClient);
          _dispatchReady();
          console.log('[supabaseBrowserClient] reused existing window.supabase');
          return;
        }
      } catch (e) {}
    }

    // attempt create using window env
    const created = await _createClientFromWindowEnv();
    if (isValidClient(created)) {
      _realClient = created;
      _exposeClientGlobally(_realClient);
      _dispatchReady();
      console.log('[supabaseBrowserClient] initialized supabase from window env');
      return;
    }

    console.log('[supabaseBrowserClient] no supabase auto-initialized (no window client or env variables)');
  } catch (e) {
    console.error('[supabaseBrowserClient] autoInit error:', e);
  }
})();

// default export for compatibility
export default supabase;
