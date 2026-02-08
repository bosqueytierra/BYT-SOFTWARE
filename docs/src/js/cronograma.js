const CRONO_TABLE = 'cronograma_eventos';

let fc = null;
let currentEvent = null;
let selectedColor = '#2e5e4e';
let createContext = { tipo: 'visita', preDate: null };
let channelCrono = null;
let channelCots = null;
const localWrites = new Set();
let currentTab = 'todo'; // "Todo" como pestaña default
let allEventsCache = [];
const pendingCreates = new Set();
let aprobadosCache = []; // cache de proyectos/partidas para nombres

// Paleta fija de 10 colores bien diferenciados
const COLOR_PALETTE = [
  '#2e5e4e', // verde oscuro
  '#1f7a8c', // teal
  '#f18f01', // naranja
  '#e5383b', // rojo
  '#f9c74f', // amarillo
  '#90be6d', // verde claro
  '#577590', // azul grisáceo
  '#9d4edd', // violeta
  '#ff6f91', // rosa
  '#7f5539'  // café
];

// Iconos por tipo
const TIPO_ICON = {
  fabricacion: '🛠',
  programacion: '👷',
  instalacion: '👷',
  compra: '🛒',
  visita: '👤',
  rectificacion: '📏'
};

// Circulitos asignada / no asignada SOLO en paleta (no en calendario)
function asignadaBullet(ev) {
  if (ev.tipo === 'programacion' || ev.tipo === 'instalacion') {
    return ev.partida_id ? '🟢 ' : '🔴 ';
  }
  return '';
}

function pickColor(i) {
  return COLOR_PALETTE[i % COLOR_PALETTE.length];
}

function pickColorById(id) {
  if (!id) return COLOR_PALETTE[0];
  let hash = 0;
  const s = String(id);
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return COLOR_PALETTE[hash % COLOR_PALETTE.length];
}

function ensureColor(ev) {
  if (!ev.color) {
    ev.color = pickColorById(ev.cotizacion_id || ev.partida_id || ev.id);
  }
  return ev;
}

// ==== Helpers ====
function toIsoDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function comboKey({ cotizacion_id, partida_id, start, tipo }) {
  return `${cotizacion_id || ''}|${partida_id || ''}|${start || ''}|${tipo || ''}`;
}

// Deduplica por combinación (cotizacion, partida, start, tipo)
function dedupeEventos(rows = []) {
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const key = comboKey(r);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

// ==== Helpers Supabase ====
async function getSupa() {
  if (window.supabase && typeof window.supabase.from === 'function') return window.supabase;

  const client = await new Promise((resolve) => {
    let resolved = false;
    const onReady = () => {
      if (resolved) return;
      if (window.supabase && typeof window.supabase.from === 'function') {
        resolved = true;
        try { window.removeEventListener('supabase:ready', onReady); } catch (_) {}
        resolve(window.supabase);
      }
    };
    try { window.addEventListener('supabase:ready', onReady); } catch (_) {}
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try { window.removeEventListener('supabase:ready', onReady); } catch (_) {}
        resolve(null);
      }
    }, 2000);
  });

  if (!client || typeof client.from !== 'function') throw new Error('Supabase no disponible');
  return client;
}

// ==== CRUD Eventos ====
async function createEvento(payload) {
  const supa = await getSupa();
  const dbPayload = {
    cotizacion_id: payload.cotizacion_id ?? null,
    partida_id: payload.partida_id ?? null,
    tipo: payload.tipo ?? null,
    title: payload.title ?? '',
    start: payload.start ?? null,
    end: payload.end ?? null,
    color: payload.color ?? null,
    nota: payload.nota ?? null,
    cliente: payload.cliente ?? null
  };

  const { data, error } = await supa
    .from(CRONO_TABLE)
    .upsert(dbPayload, { onConflict: 'cotizacion_id,partida_id,start,tipo' })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: existing, error: errFind } = await supa
        .from(CRONO_TABLE)
        .select('*')
        .eq('cotizacion_id', dbPayload.cotizacion_id || null)
        .eq('partida_id', dbPayload.partida_id || null)
        .eq('start', dbPayload.start || null)
        .eq('tipo', dbPayload.tipo || null)
        .single();
      if (!errFind && existing) return mapEventoToCalendar(enrichWithNames(existing));
    }
    throw error;
  }

  localWrites.add(data.id);
  return mapEventoToCalendar(enrichWithNames(data));
}

// Construye patch sin tocar start si viene null/undefined
function buildDbPatch(patch) {
  const dbPatch = {};
  if (patch.nota !== undefined) dbPatch.nota = patch.nota ?? null;
  if (patch.color !== undefined) dbPatch.color = patch.color ?? null;
  // Solo enviar start si viene con valor real
  if (patch.start !== undefined && patch.start !== null) dbPatch.start = patch.start;
  if (patch.end !== undefined) dbPatch.end = patch.end ?? null;
  return dbPatch;
}

async function updateEvento(id, patch) {
  const supa = await getSupa();
  const dbPatch = buildDbPatch(patch);
  const { data, error } = await supa
    .from(CRONO_TABLE)
    .update(dbPatch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  localWrites.add(id);
  return mapEventoToCalendar(enrichWithNames(data));
}

async function deleteEvento(id) {
  const supa = await getSupa();
  const { error } = await supa
    .from(CRONO_TABLE)
    .delete()
    .eq('id', id);
  if (error) throw error;
  localWrites.add(id);
  return true;
}

// ==== Data load ====
async function loadAprobados() {
  const supa = await getSupa();
  const { data, error } = await supa
    .from('cotizaciones')
    .select('id, numero, project_key, cliente, data')
    .eq('estado', 'aprobada');
  if (error) throw error;

  aprobadosCache = (data || []).map(c => {
    const nombreProyecto =
      c.project_key ||
      c.numero ||
      c.data?.cliente?.nombre_proyecto ||
      c.data?.cliente?.nombre ||
      c.cliente?.nombre ||
      'Sin nombre';

    return {
      id: c.id,
      nombre: nombreProyecto,
      cliente: c.cliente || c.data?.cliente || null,
      partidas: Array.isArray(c.data?.partidas)
        ? c.data.partidas.map(p => ({
            id: p.id || (crypto?.randomUUID ? crypto.randomUUID() : String(Math.random())),
            nombre: p.nombre || 'Partida'
          }))
        : []
    };
  });

  return aprobadosCache;
}

function enrichWithNames(ev) {
  const proj = aprobadosCache.find(p => p.id === ev.cotizacion_id);
  const partida = proj?.partidas?.find(pt => pt.id === ev.partida_id);
  const withNames = {
    ...ev,
    cotizacion_nombre: proj?.nombre || ev.cotizacion_nombre || '',
    partida_nombre: partida?.nombre || ev.partida_nombre || ''
  };
  return ensureColor(withNames);
}

async function loadEventos() {
  const supa = await getSupa();
  const { data, error } = await supa.from(CRONO_TABLE).select('*').order('start', { ascending: true });
  if (error) throw error;
  const enriched = (data || []).map(enrichWithNames);
  allEventsCache = dedupeEventos(enriched);
  return filterEventsForTab(allEventsCache).map(mapEventoToCalendar);
}

// ==== Filtro por pestaña ====
function filterEventsForTab(events) {
  if (currentTab === 'todo') return events;
  if (currentTab === 'instalacion') return events.filter(ev => ev.tipo === 'programacion' || ev.tipo === 'instalacion');
  if (currentTab === 'fabricacion') return events.filter(ev => ev.tipo === 'fabricacion');
  if (currentTab === 'compra') return events.filter(ev => ev.tipo === 'compra');
  if (currentTab === 'visita_rect') return events.filter(ev => ev.tipo === 'visita' || ev.tipo === 'rectificacion');
  return events;
}

// ==== Títulos con prefijo + ícono (SIN bullets en calendario) ====
function prefixTitle(ev) {
  const icon = TIPO_ICON[ev.tipo] || '';
  const base = ev.title || '';
  let withPrefix = base;
  if (ev.tipo === 'programacion' || ev.tipo === 'instalacion') {
    withPrefix = base.startsWith('INT-') ? base : `INT-${base}`;
  } else if (ev.tipo === 'fabricacion') {
    withPrefix = base.startsWith('FAB-') ? base : `FAB-${base}`;
  } else if (ev.tipo === 'compra') {
    withPrefix = base.startsWith('COM-') ? base : `COM-${base}`;
  } else if (ev.tipo === 'visita') {
    withPrefix = base.startsWith('Visita -') ? base : `Visita - ${base}`;
  } else if (ev.tipo === 'rectificacion') {
    withPrefix = base.startsWith('Rectificación -') ? base : `Rectificación - ${base}`;
  }
  return `${icon} ${withPrefix}`;
}

// ==== Mappers ====
function mapEventoToCalendar(ev) {
  const ensured = ensureColor(ev);
  const titled = { ...ensured, title: prefixTitle(ensured) };
  const title = titled.nota ? `${titled.title} (${titled.nota})` : titled.title;
  return {
    id: titled.id,
    title,
    start: titled.start,
    end: titled.end,
    backgroundColor: titled.color || '#2e5e4e',
    borderColor: titled.color || '#2e5e4e',
    allDay: true,
    extendedProps: {
      tipo: titled.tipo,
      cotizacion_id: titled.cotizacion_id,
      cotizacion_nombre: titled.cotizacion_nombre,
      partida_id: titled.partida_id,
      partida_nombre: titled.partida_nombre,
      cliente: titled.cliente,
      nota: titled.nota,
      color: titled.color
    }
  };
}

// ==== Render palette & stats ====
function renderPalette(aprobados, eventos = []) {
  renderPaletteByType('paletteInst', aprobados, eventos, 'programacion');
  renderPaletteByType('paletteFab', aprobados, eventos, 'fabricacion');
}

function renderPaletteByType(containerId, aprobados, eventos, tipoDefault) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const asignadasPorProyecto = new Map();
  if (tipoDefault === 'programacion' || tipoDefault === 'instalacion') {
    eventos
      .filter(e => (e.extendedProps?.tipo === 'programacion' || e.extendedProps?.tipo === 'instalacion') && e.extendedProps?.cotizacion_id && e.extendedProps?.partida_id)
      .forEach(e => {
        const pid = e.extendedProps.cotizacion_id;
        const set = asignadasPorProyecto.get(pid) || new Set();
        set.add(e.extendedProps.partida_id);
        asignadasPorProyecto.set(pid, set);
      });
  }

  aprobados.forEach((proj, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'project-block';

    const header = document.createElement('div');
    header.className = 'project-header';
    const progressText = (tipoDefault === 'fabricacion') ? '' : ` (${asignadasPorProyecto.get(proj.id)?.size || 0}/${proj.partidas?.length || 0})`;
    header.innerHTML = `
      <div class="project-title">${proj.nombre}${progressText}</div>
      <button class="toggle-btn" type="button">Ver partidas</button>
    `;
    const body = document.createElement('div');
    body.className = 'partidas-list';
    body.style.display = 'none';

    const color = pickColor(idx);

    (proj.partidas || []).forEach(p => {
      const chip = document.createElement('div');
      chip.className = 'chip fc-event';
      chip.draggable = true;

      let bullet = '';
      if (tipoDefault === 'programacion' || tipoDefault === 'instalacion') {
        bullet = asignadasPorProyecto.get(proj.id)?.has(p.id) ? '🟢' : '🔴';
      }

      chip.innerHTML = `<span class="bullet">${bullet}</span><strong>${p.nombre}</strong><span>${proj.cliente?.nombre || proj.cliente?.razon_social || ''}</span>`;
      chip.dataset.payload = JSON.stringify({
        cotizacion_id: proj.id,
        cotizacion_nombre: proj.nombre,
        partida_id: p.id,
        partida_nombre: p.nombre,
        color,
        cliente: proj.cliente?.nombre || proj.cliente?.razon_social || proj.cliente || '',
        tipoDefault
      });
      chip.addEventListener('dragstart', ev => {
        ev.dataTransfer.setData('text', chip.dataset.payload);
      });
      body.appendChild(chip);
    });

    header.querySelector('.toggle-btn').onclick = () => {
      const isHidden = body.style.display === 'none';
      body.style.display = isHidden ? 'grid' : 'none';
      header.querySelector('.toggle-btn').textContent = isHidden ? 'Ocultar' : 'Ver partidas';
    };

    wrap.appendChild(header);
    wrap.appendChild(body);
    container.appendChild(wrap);
  });

  setupPaletteDraggable(containerId, tipoDefault);
}

function setupPaletteDraggable(containerId, tipoDefault) {
  const paletteEl = document.getElementById(containerId);
  if (!paletteEl || typeof FullCalendar === 'undefined' || !FullCalendar.Draggable) return;

  new FullCalendar.Draggable(paletteEl, {
    itemSelector: '.chip',
    eventData: function(el) {
      try {
        const data = JSON.parse(el.dataset.payload || '{}');
        return {
          title: `${data.cotizacion_nombre || 'Proyecto'} - ${data.partida_nombre || 'Partida'}`,
          duration: { days: 1 },
          allDay: true,
          backgroundColor: data.color || '#2e5e4e',
          borderColor: data.color || '#2e5e4e',
          extendedProps: {
            tipo: data.tipoDefault || tipoDefault || 'programacion',
            cotizacion_id: data.cotizacion_id || null,
            cotizacion_nombre: data.cotizacion_nombre || '',
            partida_id: data.partida_id || null,
            partida_nombre: data.partida_nombre || '',
            cliente: data.cliente || null
          }
        };
      } catch (err) {
        console.warn('No se pudo parsear payload de chip', err);
        return {};
      }
    }
  });
}

// ==== Render stats ====
function renderStats(aprobados, eventos) {
  const totalInstalacion = aprobados.reduce((acc, p) => acc + (p.partidas?.length || 0), 0);
  const programadasSet = new Set(
    (eventos || [])
      .filter(e => (e.extendedProps?.tipo === 'programacion' || e.extendedProps?.tipo === 'instalacion') && e.extendedProps?.partida_id)
      .map(e => `${e.extendedProps.cotizacion_id}::${e.extendedProps.partida_id}`)
  );
  const programadas = programadasSet.size;
  const porProgramar = Math.max(0, totalInstalacion - programadas);
  const elProg = document.getElementById('statProgramadas');
  const elNoProg = document.getElementById('statNoProgramadas');
  if (elProg) elProg.textContent = programadas;
  if (elNoProg) elNoProg.textContent = porProgramar;
}

function renderVisitasRect(eventos) {
  const visitasList = document.getElementById('visitasList');
  const rectList = document.getElementById('rectList');
  if (visitasList) visitasList.innerHTML = '';
  if (rectList) rectList.innerHTML = '';
  (eventos || []).forEach(ev => {
    if (ev.extendedProps?.tipo === 'visita' && visitasList) {
      const div = document.createElement('div');
      div.className = 'chip';
      div.textContent = ev.title;
      visitasList.appendChild(div);
    }
    if (ev.extendedProps?.tipo === 'rectificacion' && rectList) {
      const div = document.createElement('div');
      div.className = 'chip';
      div.textContent = ev.title;
      rectList.appendChild(div);
    }
  });
}

// ==== FullCalendar ====
function initCalendar(eventosIniciales = []) {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) return;

  fc = new FullCalendar.Calendar(calendarEl, {
    locale: 'es',
    firstDay: 1,
    buttonText: { today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día', list: 'Lista' },
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: ''
    },
    selectable: false,
    editable: true,
    droppable: true,
    eventReceive: onExternalDrop,
    eventDrop: onEventMoved,
    eventResize: onEventMoved,
    eventClick: onEventClick,
    events: eventosIniciales,
    eventMinHeight: 18,
    eventDidMount: (info) => {
      info.el.style.minHeight = '18px';
      info.el.style.padding = '2px 6px';
      info.el.style.lineHeight = '1.2';
      info.el.style.whiteSpace = 'normal';
    }
  });

  fc.render();
  bindCreateModals();
  bindColorPicker();
  bindTabs();
}

// ==== Tabs ====
function bindTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const container = document.querySelector('.tabs-vertical');
  const todoBtn = Array.from(tabs).find(b => b.dataset.tab === 'todo');
  if (todoBtn && container) container.prepend(todoBtn);
  tabs.forEach(b => b.classList.remove('active'));
  if (todoBtn) todoBtn.classList.add('active');

  tabs.forEach(btn => {
    btn.onclick = () => {
      tabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      renderCalendarEvents();
    };
  });
}

function renderCalendarEvents() {
  if (!fc) return;
  fc.getEvents().forEach(e => e.remove());
  const filtered = filterEventsForTab(allEventsCache).map(mapEventoToCalendar);
  filtered.forEach(ev => fc.addEvent(ev));
  fc.setOption('droppable', currentTab === 'instalacion' || currentTab === 'fabricacion' || currentTab === 'todo');
}

// Drop externo (paleta -> calendario)
async function onExternalDrop(info) {
  const ext = info.event.extendedProps || {};
  const data = info.draggedEl?.dataset?.payload ? JSON.parse(info.draggedEl.dataset.payload) : {};
  const startDate = info.event.start || info.date;
  const tipo =
    currentTab === 'fabricacion'
      ? 'fabricacion'
      : currentTab === 'todo'
        ? (ext.tipo || data.tipoDefault || 'programacion')
        : 'programacion';
  const baseTitle = info.event.title || `${data.cotizacion_nombre || 'Proyecto'} - ${data.partida_nombre || 'Partida'}`;

  const chosenColor =
    ext.color ||
    data.color ||
    info.event.backgroundColor ||
    pickColorById(ext.cotizacion_id || data.cotizacion_id || ext.partida_id || data.partida_id);

  const payload = {
    cotizacion_id: ext.cotizacion_id || data.cotizacion_id || null,
    partida_id: ext.partida_id || data.partida_id || null,
    tipo,
    title: baseTitle,
    start: startDate ? toIsoDay(startDate) : new Date().toISOString(),
    end: null,
    color: chosenColor,
    nota: null,
    cliente: ext.cliente || data.cliente || null
  };
  const key = comboKey(payload);

  if (!(currentTab === 'instalacion' || currentTab === 'fabricacion' || currentTab === 'todo')) {
    info.revert && info.revert();
    window.utils?.mostrarNotificacion?.('Solo puedes arrastrar en Instalación, Fabricación o Todo', 'warning');
    return;
  }
  if (pendingCreates.has(key)) {
    info.revert && info.revert();
    return;
  }

  pendingCreates.add(key);
  try {
    const ev = await createEvento(payload);
    ev.extendedProps.cotizacion_nombre = data.cotizacion_nombre || ext.cotizacion_nombre || ev.extendedProps.cotizacion_nombre;
    ev.extendedProps.partida_nombre = data.partida_nombre || ext.partida_nombre || ev.extendedProps.partida_nombre;
    info.event.remove();
    fc.addEvent(ev);
    refreshStatsAndLists();
  } catch (e) {
    console.error('onExternalDrop error', e);
    window.utils?.mostrarNotificacion?.('Ya existe este evento en esa fecha', 'warning');
    info.revert && info.revert();
  } finally {
    pendingCreates.delete(key);
  }
}

// Move/resize
async function onEventMoved(info) {
  try {
    const id = info.event.id;
    const patch = {
      start: info.event.start ? toIsoDay(info.event.start) : null,
      end: info.event.end ? toIsoDay(info.event.end) : null
    };
    const ev = await updateEvento(id, patch);
    info.event.remove();
    fc.addEvent(ev);
    refreshStatsAndLists();
  } catch (e) {
    console.error('onEventMoved error', e);
    window.utils?.mostrarNotificacion?.('No se pudo mover/redimensionar', 'error');
    info.revert();
  }
}

// Click en evento
function onEventClick(info) {
  currentEvent = info.event;
  openEventModal(info.event);
}

// ==== Modal de evento ====
function openEventModal(ev) {
  const backdrop = document.getElementById('modalBackdrop');
  if (!backdrop) return;
  const props = ev.extendedProps || {};
  document.getElementById('modalTitle').textContent = ev.title;
  document.getElementById('modalProyecto').textContent = props.cotizacion_nombre || props.cotizacion_id || '—';
  document.getElementById('modalPartida').textContent = props.partida_nombre || props.partida_id || (props.tipo || '—');
  document.getElementById('modalCliente').textContent = props.cliente || '—';
  document.getElementById('modalFecha').textContent = ev.start ? ev.start.toLocaleString() : '—';
  const notaEl = document.getElementById('modalNota');
  if (notaEl) notaEl.value = props.nota || '';
  setColorPicker(props.color || ev.backgroundColor || '#2e5e4e');

  const btnSave = document.getElementById('modalSave');
  const btnDelete = document.getElementById('modalDelete');
  const btnClose = document.getElementById('modalClose');

  btnSave.onclick = async () => {
    try {
      const nota = document.getElementById('modalNota')?.value || null;
      const color = selectedColor;
      const patch = { nota, color };
      const updated = await updateEvento(ev.id, patch);
      updated.extendedProps.cotizacion_nombre = props.cotizacion_nombre;
      updated.extendedProps.partida_nombre = props.partida_nombre;
      ev.remove();
      fc.addEvent(updated);
      refreshStatsAndLists();
      closeEventModal();
    } catch (e) {
      console.error('modal save error', e);
      window.utils?.mostrarNotificacion?.('Error al guardar evento', 'error');
    }
  };

  btnDelete.onclick = async () => {
    try {
      await deleteEvento(ev.id);
      ev.remove();
      refreshStatsAndLists();
      closeEventModal();
    } catch (e) {
      console.error('modal delete error', e);
      window.utils?.mostrarNotificacion?.('Error al eliminar evento', 'error');
    }
  };

  btnClose.onclick = closeEventModal;
  backdrop.style.display = 'flex';
}

function closeEventModal() {
  const backdrop = document.getElementById('modalBackdrop');
  if (backdrop) backdrop.style.display = 'none';
  currentEvent = null;
}

// ==== Color picker modal ====
function getOrCreateColorPicker() {
  let picker = document.getElementById('modalColorPicker');
  if (!picker) {
    picker = document.createElement('div');
    picker.id = 'modalColorPicker';
    picker.className = 'color-picker';
    const target = document.getElementById('modalColorWrapper')
      || document.getElementById('modalColorRow')
      || document.querySelector('#modalBackdrop .modal-body')
      || document.body;
    target.appendChild(picker);
  }
  picker.style.display = 'flex';
  picker.style.flexWrap = 'wrap';
  picker.style.gap = '6px';
  picker.style.margin = '8px 0';
  return picker;
}

function bindColorPicker() {
  setColorPicker(selectedColor);
}

function setColorPicker(color) {
  selectedColor = color;
  const picker = getOrCreateColorPicker();
  picker.innerHTML = '';
  COLOR_PALETTE.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'color-swatch' + (c === color ? ' active' : '');
    sw.style.background = c;
    sw.style.width = '18px';
    sw.style.height = '18px';
    sw.style.borderRadius = '4px';
    sw.style.border = '1px solid #555';
    sw.style.cursor = 'pointer';
    sw.onclick = () => {
      selectedColor = c;
      picker.querySelectorAll('.color-swatch').forEach(el => el.classList.remove('active'));
      sw.classList.add('active');
    };
    picker.appendChild(sw);
  });
}

// ==== Modal crear visita/rectificación/compra ====
// Para VISITA: entrada por teclado (input #createProyectoTexto); ignoramos el select.
// Para rectificación/compra: sigue usando el select existente.
function bindCreateModals() {
  const btnVisita = document.getElementById('btnAddVisita');
  const btnRect = document.getElementById('btnAddRect');
  const btnCompra = document.getElementById('btnAddCompra');
  if (btnVisita) btnVisita.onclick = () => openCreateModal({ tipo: 'visita' });
  if (btnRect) btnRect.onclick = () => openCreateModal({ tipo: 'rectificacion' });
  if (btnCompra) btnCompra.onclick = () => openCreateModal({ tipo: 'compra' });
  const cancel = document.getElementById('createCancel');
  const save = document.getElementById('createSave');
  if (cancel) cancel.onclick = closeCreateModal;
  if (save) save.onclick = onCreateSave;
}

function openCreateModal({ tipo = 'visita', preDate = null } = {}) {
  createContext = { tipo, preDate };
  const backdrop = document.getElementById('createBackdrop');
  if (!backdrop) return;
  const titleEl = document.getElementById('createTitle');
  if (titleEl) {
    if (tipo === 'rectificacion') titleEl.textContent = 'Agregar rectificación';
    else if (tipo === 'compra') titleEl.textContent = 'Agregar compra';
    else titleEl.textContent = 'Agregar visita';
  }
  // Mostrar/ocultar UI: para visita, mostrar input texto y ocultar select
  const sel = document.getElementById('createProyecto');
  const inp = document.getElementById('createProyectoTexto');
  if (sel) sel.style.display = (tipo === 'visita') ? 'none' : 'block';
  if (inp) inp.style.display = (tipo === 'visita') ? 'block' : 'none';
  backdrop.style.display = 'flex';
}

function closeCreateModal() {
  const backdrop = document.getElementById('createBackdrop');
  if (backdrop) backdrop.style.display = 'none';
  createContext = { tipo: 'visita', preDate: null };
}

async function onCreateSave() {
  const proyectoInput = document.getElementById('createProyectoTexto')?.value?.trim();
  const proyectoSel = document.getElementById('createProyecto')?.value || '';
  const proyectoTextSel = document.getElementById('createProyecto')?.selectedOptions?.[0]?.text || '';
  const tipo = createContext.tipo || 'visita';

  const isVisita = tipo === 'visita';
  // Para visita, solo entrada por teclado; si está vacío, avisamos.
  if (isVisita && !proyectoInput) {
    window.utils?.mostrarNotificacion?.('Ingresa un nombre para la visita', 'warning');
    return;
  }

  const proyectoNombre = isVisita
    ? proyectoInput
    : (proyectoTextSel || 'Proyecto');

  const proyectoId = isVisita ? null : (proyectoSel || null);

  if (!proyectoId && !isVisita) {
    window.utils?.mostrarNotificacion?.('Selecciona un proyecto', 'warning');
    return;
  }

  const baseTitle = tipo === 'visita'
    ? `Visita - ${proyectoNombre}`
    : tipo === 'rectificacion'
      ? `Rectificación - ${proyectoNombre}`
      : tipo === 'compra'
        ? `COM-${proyectoNombre}`
        : proyectoNombre;

  const payload = {
    tipo,
    cotizacion_id: proyectoId,
    partida_id: null,
    title: baseTitle,
    start: createContext.preDate || new Date().toISOString(),
    end: null,
    color: selectedColor,
    nota: null,
    cliente: null
  };
  try {
    const ev = await createEvento(payload);
    ev.extendedProps.cotizacion_nombre = proyectoNombre;
    ev.extendedProps.partida_nombre = '';
    fc.addEvent(ev);
    refreshStatsAndLists();
    closeCreateModal();
  } catch (e) {
    console.error('onCreateSave error', e);
    window.utils?.mostrarNotificacion?.('Error al crear evento', 'error');
  }
}

// ==== Realtime ====
async function subscribeRealtime() {
  const supa = await getSupa();
  const logStatus = (tag) => (status) => console.log(`realtime ${tag}`, status);

  const setupChannel = (prevChannel, topic, filter, handler) => {
    try { prevChannel?.unsubscribe?.(); } catch (_) {}
    const ch = supa
      .channel(topic)
      .on('error', (err) => console.error(`channel ${topic} error`, err))
      .on('close', (ev) => {
        console.warn(`channel ${topic} close`, ev);
        setTimeout(() => subscribeRealtime(), 500);
      })
      .on('postgres_changes', filter, handler)
      .subscribe(logStatus(topic));
    return ch;
  };

  channelCrono = setupChannel(channelCrono, 'cronograma-events', { event: '*', schema: 'public', table: CRONO_TABLE }, handleCronoChange);
  channelCots = setupChannel(channelCots, 'cronograma-cots', { event: '*', schema: 'public', table: 'cotizaciones' }, handleCotChange);
}

async function handleCronoChange(payload) {
  const { eventType, new: rowNew, old: rowOld } = payload;
  const id = rowNew?.id || rowOld?.id;
  if (localWrites.has(id)) return;

  if (eventType === 'INSERT') {
    const ev = mapEventoToCalendar(enrichWithNames(rowNew));
    fc?.addEvent(ev);
  } else if (eventType === 'UPDATE') {
    const evExist = fc?.getEventById(id);
    if (evExist) evExist.remove();
    const ev = mapEventoToCalendar(enrichWithNames(rowNew));
    fc?.addEvent(ev);
  } else if (eventType === 'DELETE') {
    const evExist = fc?.getEventById(id);
    if (evExist) evExist.remove();
  }
  refreshStatsAndLists();
}

async function handleCotChange(payload) {
  const { new: rowNew, old: rowOld } = payload;
  const wasApproved = rowOld?.estado === 'aprobada';
  const isApproved = rowNew?.estado === 'aprobada';
  if (wasApproved || isApproved) {
    try {
      const aprobados = await loadAprobados();
      const eventos = fc ? fc.getEvents().map(e => ({
        id: e.id,
        start: e.start,
        end: e.end,
        title: e.title,
        extendedProps: e.extendedProps
      })) : [];
      renderPalette(aprobados, eventos);
      fillSelectProyectos(aprobados);
      renderStats(aprobados, eventos);
    } catch (e) {
      console.warn('No se pudo refrescar paleta/stats tras cambio de cotización', e);
    }
  }
}

// ==== Misceláneo ====
async function refreshStatsAndLists() {
  try {
    const [aprobados, eventosRawDb] = await Promise.all([loadAprobados(), loadEventos()]);
    renderPalette(aprobados, eventosRawDb);
    fillSelectProyectos(aprobados);
    renderStats(aprobados, eventosRawDb);
    renderVisitasRect(eventosRawDb);
    renderCalendarEvents();
  } catch (e) {
    console.warn('No se pudieron refrescar stats/listas', e);
  }
}

function fillSelectProyectos(aprobados) {
  const sel = document.getElementById('createProyecto');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">-- Seleccionar --</option>';
  aprobados.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.nombre;
    sel.appendChild(opt);
  });
  if (current) sel.value = current;
}

// ==== Init ====
async function initCronograma() {
  try {
    await getSupa();
    const [aprobados, eventos] = await Promise.all([loadAprobados(), loadEventos()]);
    renderPalette(aprobados, eventos);
    fillSelectProyectos(aprobados);
    renderStats(aprobados, eventos);
    renderVisitasRect(eventos);
    initCalendar(eventos);
    subscribeRealtime();
  } catch (err) {
    console.error('Error inicializando cronograma', err);
    window.utils?.mostrarNotificacion?.('Error cargando cronograma: ' + (err.message || err), 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initCronograma();
});

window.addEventListener('beforeunload', () => {
  channelCrono?.unsubscribe?.();
  channelCots?.unsubscribe?.();
});
