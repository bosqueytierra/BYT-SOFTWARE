// Supabase browser client — robust initializer and runtime shim
// - Exporta named `supabase` (Proxy) inmediatamente.
// - Proporciona ensureSupabase(timeoutMs), getClient(), initializeSupabase({url,key}).
// - Lee credenciales desde window, localStorage, o desde un archivo central servido por GitHub Pages:
//   /BYT_SOFTWARE/supabase-config.json
// - Soporta polling para reconfiguración en caliente (opcional).

let _realClient = null;
let _initializing = false;
let _autoInitAttempted = false;

const LS_KEY_URL = 'byt_supabase_url';
const LS_KEY_KEY = 'byt_supabase_anon_key';

// IMPORTANT: GitHub Pages path to the JSON in your repo root
const SERVER_CONFIG_URL = 'https://raw.githubusercontent.com/bosqueytierra/BYT-SOFTWARE/main/BYT_SOFTWARE/supabase-config.json';

// Poll interval ms to check for remote config changes (set to 0 to disable)
const CONFIG_POLL_INTERVAL_MS = 30 * 1000; // 30s

let _lastServerConfig = null;
let _configPollerId = null;

function isValidClient(c) {
  return !!c && typeof c.from === 'function';
}

async function _createClient(url, key) {
  if (!url || !key) return null;
  try {
    const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    const { createClient } = mod;
    if (typeof createClient !== 'function') return null;
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 5 } }
    });
    try { client?.realtime?.setAuth?.(key); } catch (e) {}
    return client;
  } catch (e) {
    console.error('[supabaseBrowserClient] error importing supabase-js:', e);
    return null;
  }
}

async function _fetchConfigFromServer() {
  try {
    const r = await fetch(SERVER_CONFIG_URL, { cache: 'no-cache' });
    if (!r.ok) return null;
    const j = await r.json();
    const url = j?.url || j?.supabaseUrl || null;
    const key = j?.anonKey || j?.anon_key || j?.supabaseAnonKey || null;
    if (url && key) return { url, key };
  } catch (e) {
    // ignore network errors
  }
  return null;
}

async function _createClientFromWindowEnv() {
  if (typeof window === 'undefined') return null;

  const url = window.SUPABASE_URL || window.__SUPABASE_URL || null;
  const key = window.SUPABASE_ANON_KEY || window.__SUPABASE_ANON_KEY || null;
  if (url && key) return await _createClient(url, key);

  try {
    const lsUrl = localStorage.getItem(LS_KEY_URL) || null;
    const lsKey = localStorage.getItem(LS_KEY_KEY) || null;
    if (lsUrl && lsKey) return await _createClient(lsUrl, lsKey);
  } catch (e) {}

  const serverCfg = await _fetchConfigFromServer();
  if (serverCfg && serverCfg.url && serverCfg.key) return await _createClient(serverCfg.url, serverCfg.key);

  return null;
}

function _exposeClientGlobally(client) {
  try {
    if (typeof window !== 'undefined') {
      window.supabase = client;
      window.globalSupabase = window.globalSupabase || {};
      window.globalSupabase.client = client;
    }
  } catch (e) {}
}

function _dispatchReady() {
  try { if (typeof window !== 'undefined') window.dispatchEvent(new Event('supabase:ready')); } catch (e) {}
}
function _dispatchUpdated(detail = {}) {
  try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('supabase:updated', { detail })); } catch (e) {}
}

export async function initializeSupabase({ url, key } = {}) {
  if (isValidClient(_realClient)) return _realClient;

  if (url && key) {
    const client = await _createClient(url, key);
    if (isValidClient(client)) {
      _realClient = client;
      try { localStorage.setItem(LS_KEY_URL, url); localStorage.setItem(LS_KEY_KEY, key); } catch (e) {}
      _exposeClientGlobally(_realClient);
      _dispatchReady();
      console.log('[supabaseBrowserClient] initializeSupabase: cliente inicializado y expuesto (from args)');
      _lastServerConfig = { url, key };
      return _realClient;
    }
    return null;
  }

  const created = await _createClientFromWindowEnv();
  if (isValidClient(created)) {
    _realClient = created;
    _exposeClientGlobally(_realClient);
    _dispatchReady();
    console.log('[supabaseBrowserClient] initializeSupabase: cliente inicializado desde window/localStorage/server-config');
    try { const serverCfg = await _fetchConfigFromServer(); if (serverCfg) _lastServerConfig = serverCfg; } catch(e){}
    return _realClient;
  }

  return null;
}

export async function ensureSupabase(timeoutMs = 5000) {
  if (isValidClient(_realClient)) return _realClient;

  if (_initializing) {
    const start = Date.now();
    while (_initializing && (Date.now() - start) < timeoutMs) await new Promise(r => setTimeout(r, 100));
    return isValidClient(_realClient) ? _realClient : null;
  }

  _initializing = true;
  try {
    // no reutilizamos window.supabase sin recrear opciones; creamos desde config
    const created = await _createClientFromWindowEnv();
    if (isValidClient(created)) {
      _realClient = created;
      _exposeClientGlobally(_realClient);
      _dispatchReady();
      try { const serverCfg = await _fetchConfigFromServer(); if (serverCfg) _lastServerConfig = serverCfg; } catch(e){}
      console.log('[supabaseBrowserClient] supabase initialized from window/localStorage/server and exposed globally');
      return _realClient;
    }

    let resolved = false;
    const promise = new Promise((resolve) => {
      const onReady = () => {
        if (resolved) return;
        resolved = true;
        cleanup();
        try {
          if (isValidClient(window.supabase)) _realClient = window.supabase;
          else if (window.globalSupabase && isValidClient(window.globalSupabase.client)) _realClient = window.globalSupabase.client;
        } catch (e) {}
        resolve(isValidClient(_realClient) ? _realClient : null);
      };
      const cleanup = () => { try { window.removeEventListener('supabase:ready', onReady); } catch (e) {} ; clearInterval(poller); clearTimeout(timeoutId); };
      try { window.addEventListener('supabase:ready', onReady); } catch (e) {}
      const poller = setInterval(() => {
        try {
          if (isValidClient(window.supabase) || (window.globalSupabase && isValidClient(window.globalSupabase.client))) onReady();
        } catch (e) {}
      }, 200);

      const timeoutId = setTimeout(() => { if (resolved) return; resolved = true; cleanup(); resolve(null); }, timeoutMs);
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

export function getClient() { return _realClient; }

class QueryShim {
  constructor(table) { this._table = table; this._ops = []; this._promise = null; }
  _push(method, args) { this._ops.push({ method, args }); return this; }
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
        const client = await ensureSupabase(10000);
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

const authShim = {
  async getSession() { const client = await ensureSupabase(); if (!client || !client.auth || typeof client.auth.getSession !== 'function') return { data: { session: null }, error: new Error('Auth not available') }; return client.auth.getSession(); },
  async signIn(...args) { const client = await ensureSupabase(); if (!client || !client.auth || typeof client.auth.signIn !== 'function') throw new Error('Auth not available'); return client.auth.signIn(...args); },
  async signOut(...args) { const client = await ensureSupabase(); if (!client || !client.auth || typeof client.auth.signOut !== 'function') throw new Error('Auth not available'); return client.auth.signOut(...args); }
};

export const supabase = new Proxy({}, {
  get(_, prop) {
    if (isValidClient(_realClient)) {
      const val = _realClient[prop];
      if (typeof val === 'function') return val.bind(_realClient);
      return val;
    }
    if (prop === 'from') return (table) => new QueryShim(table);
    if (prop === 'auth') return authShim;
    if (prop === 'ensureSupabase') return ensureSupabase;
    if (prop === 'initializeSupabase') return initializeSupabase;
    if (prop === 'getClient' || prop === 'get') return getClient;
    return undefined;
  },
  set(_, prop, value) { if (isValidClient(_realClient)) { try { _realClient[prop] = value; } catch (e) {} } return true; },
  has(_, prop) { if (prop === 'from' || prop === 'auth' || prop === 'ensureSupabase' || prop === 'initializeSupabase') return true; return isValidClient(_realClient) ? prop in _realClient : false; }
});

(async function _autoInit() {
  if (_autoInitAttempted) return;
  _autoInitAttempted = true;
  try {
    const created = await _createClientFromWindowEnv();
    if (isValidClient(created)) {
      _realClient = created;
      _exposeClientGlobally(_realClient);
      _dispatchReady();
      try { const serverCfg = await _fetchConfigFromServer(); if (serverCfg) _lastServerConfig = serverCfg; } catch(e){}
      if (CONFIG_POLL_INTERVAL_MS > 0) _startConfigPoller();
      console.log('[supabaseBrowserClient] initialized supabase from window/localStorage/server-config');
      return;
    }
    console.log('[supabaseBrowserClient] no supabase auto-initialized (no window client, env, localStorage or server config)');
    if (CONFIG_POLL_INTERVAL_MS > 0) _startConfigPoller();
  } catch (e) {
    console.error('[supabaseBrowserClient] autoInit error:', e);
  }
})();

function _startConfigPoller() {
  if (_configPollerId) return;
  try {
    _configPollerId = setInterval(async () => {
      try {
        const cfg = await _fetchConfigFromServer();
        if (!cfg) return;
        const changed = !_lastServerConfig || cfg.url !== _lastServerConfig.url || cfg.key !== _lastServerConfig.key;
        if (changed) {
          console.log('[supabaseBrowserClient] server config changed — reinitializing supabase client');
          _lastServerConfig = cfg;
          const newClient = await _createClient(cfg.url, cfg.key);
          if (isValidClient(newClient)) {
            _realClient = newClient;
            try { localStorage.setItem(LS_KEY_URL, cfg.url); localStorage.setItem(LS_KEY_KEY, cfg.key); } catch(e){}
            _exposeClientGlobally(_realClient);
            _dispatchReady();
            _dispatchUpdated({ url: cfg.url });
            console.log('[supabaseBrowserClient] supabase reinitialized from updated server config and exposed globally');
          } else {
            console.warn('[supabaseBrowserClient] could not create client from updated server config');
          }
        }
      } catch (e) {}
    }, CONFIG_POLL_INTERVAL_MS);
  } catch (e) {}
}

export default supabase;
