// Wizard integration: lock acquire/renew/release + autosave (15s) + realtime sync
// Integración con src/js/supabase.client.test.js (tryAcquireLock, tryReleaseLock, upsertQuote, subscribeToQuotes)
// Uso: import { initWizard } from '/src/js/wizard.js';
//
// Notas:
// - Requiere src/js/supabase.client.test.js y que window.SUPABASE_* esté definido
// - autosaveInterval por defecto 15000 ms (15 segundos)
// - lockTTL por defecto 300 segundos (5 minutos); renew correrá a la mitad del TTL
//
// Ejemplo de inicialización:
// import { initWizard } from '/src/js/wizard.js';
// const wizard = initWizard({ quoteId: '<QUOTE_UUID>', formSelector: '#quoteForm', onStatus: msg => console.log(msg) });
// // Cuando termines:
// wizard.stop();

import { tryAcquireLock, tryReleaseLock, upsertQuote, subscribeToQuotes } from './supabase.client.test.js';

// NOTE: Credentials duplicated here because this file uses CDN imports (not npm)
// and cannot import from the canonical client. These values set window.SUPABASE_*
// for use by the test file and other browser scripts.
const SUPABASE_URL = window.SUPABASE_URL || 'https://paatfcaylifoqbsqqvpq.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYXRmY2F5bGlmb3FxdnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzODg2NTgsImV4cCI6MjA3NTk2NDY1OH0.A4-1_eqqWhYDTFvqrdolwNQgx4HUsVNE07Y_VK25feE';

// For backwards compatibility, set window variables
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

export function initWizard(options = {}) {
  const {
    quoteId,
    formSelector = '#quoteForm',
    autosaveInterval = 15000, // 15 segundos según pedido
    lockTTL = 300, // segundos
    renewInterval = Math.max(15000, (lockTTL * 1000) / 2), // ms: mitad del TTL (mín 15s)
    onStatus = (msg) => { console.log('[wizard]', msg); }
  } = options;

  if (!quoteId) throw new Error('quoteId es requerido para initWizard');

  const form = document.querySelector(formSelector);
  let hasLock = false;
  let dirty = false;
  let autosaveTimer = null;
  let renewTimer = null;
  let subscription = null;
  let stopped = false;

  function setUIEditable(editable) {
    if (!form) return;
    const elements = form.querySelectorAll('input, textarea, select');
    elements.forEach(el => {
      // mantener botones habilitados; deshabilitar inputs/selecciones si no editable
      el.disabled = !editable;
    });
    const statusEl = document.getElementById('lockStatus');
    if (statusEl) statusEl.textContent = editable ? 'Editable' : 'Solo lectura (bloqueado)';
  }

  function markDirty() { dirty = true; }

  async function fetchLockerInfo() {
    const { data: lockRows, error } = await supabase.from('quote_locks').select('*').eq('quote_id', quoteId).limit(1);
    if (error) {
      console.warn('fetchLockerInfo error', error);
      return null;
    }
    if (!lockRows || lockRows.length === 0) return null;
    const locker = lockRows[0].locker;
    const { data: profile } = await supabase.from('app_profiles').select('full_name').eq('id', locker).single();
    return { locker, name: profile?.full_name || null, locked_at: lockRows[0].locked_at, expires_at: lockRows[0].expires_at };
  }

  async function tryLock() {
    try {
      const res = await tryAcquireLock(quoteId, lockTTL);
      if (res?.acquired) {
        hasLock = true;
        onStatus('Bloqueo adquirido');
        setUIEditable(true);
      } else {
        hasLock = false;
        const info = await fetchLockerInfo();
        onStatus(info && info.name ? `Bloqueado por ${info.name}` : 'Bloqueado por otro usuario');
        setUIEditable(false);
      }
      return res;
    } catch (err) {
      console.error('tryLock error', err);
      onStatus('Error de bloqueo');
      return { acquired: false, error: err };
    }
  }

  async function releaseLock() {
    if (!hasLock) return { released: false, reason: 'no-lock' };
    try {
      const res = await tryReleaseLock(quoteId);
      hasLock = false;
      onStatus('Bloqueo liberado');
      setUIEditable(false);
      return res;
    } catch (err) {
      console.error('releaseLock error', err);
      return { released: false, error: err };
    }
  }

  async function saveNow() {
    if (!hasLock) return { error: 'no-lock' };
    if (!form) return { error: 'no-form' };

    // Construir payload JSON desde los inputs del formulario
    const fd = new FormData(form);
    const obj = {};
    fd.forEach((value, key) => {
      // manejar valores múltiples
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (!Array.isArray(obj[key])) obj[key] = [obj[key]];
        obj[key].push(value);
      } else {
        obj[key] = value;
      }
    });

    const payload = {
      id: quoteId,
      data: obj,
      updated_at: new Date().toISOString()
    };

    try {
      const { data, error } = await upsertQuote(payload);
      if (error) {
        console.error('saveNow error', error);
        onStatus('Error al guardar');
        return { error };
      }
      dirty = false;
      onStatus('Guardado');
      return { data };
    } catch (err) {
      console.error('saveNow catch', err);
      onStatus('Excepción al guardar');
      return { error: err };
    }
  }

  function startAutosave() {
    if (autosaveTimer) clearInterval(autosaveTimer);
    autosaveTimer = setInterval(async () => {
      if (stopped) return;
      if (dirty && hasLock) {
        await saveNow();
      }
    }, autosaveInterval);
  }

  function startRenew() {
    if (renewTimer) clearInterval(renewTimer);
    renewTimer = setInterval(async () => {
      if (stopped) return;
      if (hasLock) {
        // llamar acquire nuevamente extiende/reemplaza la expiración del lock
        await tryLock();
      }
    }, renewInterval);
  }

  function attachFormListeners() {
    if (!form) return;
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(i => i.addEventListener('input', markDirty));
    // Si hay editores contenteditable
    const editors = form.querySelectorAll('[contenteditable="true"]');
    editors.forEach(e => e.addEventListener('input', markDirty));
  }

  function detachFormListeners() {
    if (!form) return;
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(i => i.removeEventListener('input', markDirty));
    const editors = form.querySelectorAll('[contenteditable="true"]');
    editors.forEach(e => e.removeEventListener('input', markDirty));
  }

  function applyRecordToForm(record) {
    if (!form || !record || !record.data) return;
    const data = record.data;
    Object.keys(data).forEach(k => {
      // Soporta selectores name simples
      const els = form.querySelectorAll(`[name="${k}"]`);
      if (!els || els.length === 0) {
        // fallback por id
        const elById = form.querySelector(`#${k}`);
        if (elById) {
          try { elById.value = data[k]; } catch (e) { /* ignore */ }
        }
        return;
      }
      els.forEach(el => {
        try {
          const tag = el.tagName.toLowerCase();
          if (tag === 'input') {
            const type = el.type;
            if (type === 'checkbox') {
              el.checked = Array.isArray(data[k]) ? data[k].includes(el.value) : !!data[k];
            } else if (type === 'radio') {
              el.checked = (el.value == data[k]);
            } else {
              el.value = data[k];
            }
          } else if (tag === 'textarea' || tag === 'select') {
            el.value = data[k];
          } else {
            el.textContent = data[k];
          }
        } catch (err) {
          console.warn('applyRecordToForm set error', k, err);
        }
      });
    });
  }

  async function subscribeRealtime() {
    try {
      subscription = subscribeToQuotes((payload) => {
        // manejar distintos formatos de payload
        const evType = payload.eventType || payload.event || payload.type;
        const record = payload.record || payload.new || payload.payload?.new || payload;
        if (!record) return;
        if (record.id !== quoteId) return;
        if (dirty) {
          onStatus('Actualización remota recibida (hay cambios locales)');
          return;
        }
        applyRecordToForm(record);
        onStatus('Actualización remota aplicada');
      });
    } catch (err) {
      console.warn('subscribeRealtime error', err);
    }
  }

  // beforeunload - intento de liberar lock
  async function onBeforeUnload(e) {
    if (hasLock) {
      try {
        await tryReleaseLock(quoteId);
      } catch (_) { /* ignore */ }
    }
  }

  // API pública
  const api = {
    async start() {
      attachFormListeners();
      await tryLock();
      startAutosave();
      startRenew();
      await subscribeRealtime();
      window.addEventListener('beforeunload', onBeforeUnload);
    },
    async saveNow() {
      return await saveNow();
    },
    async releaseLock() {
      return await releaseLock();
    },
    async stop() {
      stopped = true;
      detachFormListeners();
      if (autosaveTimer) clearInterval(autosaveTimer);
      if (renewTimer) clearInterval(renewTimer);
      if (subscription && typeof subscription.unsubscribe === 'function') {
        try { await subscription.unsubscribe(); } catch (_) { /* ignore */ }
      }
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (hasLock) {
        try { await tryReleaseLock(quoteId); } catch (_) { /* ignore */ }
      }
      onStatus('Wizard detenido y limpieza realizada');
    }
  };

  api.start().catch(err => {
    console.error('initWizard start error', err);
  });

  return api;
}
