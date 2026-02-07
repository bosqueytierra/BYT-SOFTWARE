const CRONO_TABLE = 'cronograma_eventos';

let fc = null;
let currentEvent = null;
let selectedColor = '#2e5e4e';
let createContext = { tipo: 'visita', preDate: null };
let channelCrono = null;
let channelCots = null;
const localWrites = new Set();
let currentTab = 'instalacion'; // instalacion | fabricacion | compra | visita_rect | todo
let allEventsCache = [];

// ==== Helpers ====
function toIsoDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function dedupeEventos(rows = []) {
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    if (!r?.id) continue;
    if (seen.has(r.id)) continue;
    seen.add(r.id);
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
  const { data, error } = await supa
    .from(CRONO_TABLE)
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  localWrites.add(data.id);
  return mapEventoToCalendar(data);
}

async function updateEvento(id, patch) {
  const supa = await getSupa();
  const { data, error } = await supa
    .from(CRONO_TABLE)
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  localWrites.add(id);
  return mapEventoToCalendar(data);
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

  return (data || []).map(c => {
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
}

async function loadEventos() {
  const supa = await getSupa();
  const { data, error } = await supa.from(CRONO_TABLE).select('*').order('start', { ascending: true });
  if (error) throw error;
  allEventsCache = dedupeEventos(data || []);
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

// ==== Títulos con prefijo ====
function prefixTitle(ev) {
  const base = ev.title || '';
  if (ev.tipo === 'programacion' || ev.tipo === 'instalacion') {
    return base.startsWith('INT-') ? base : `INT-${base}`;
  }
  if (ev.tipo === 'fabricacion') {
    return base.startsWith('FAB-') ? base : `FAB-${base}`;
  }
  if (ev.tipo === 'compra') {
    return base.startsWith('COM-') ? base : `COM-${base}`;
  }
  if (ev.tipo === 'visita') {
    return base.startsWith('Visita -') ? base : `Visita - ${base}`;
  }
  if (ev.tipo === 'rectificacion') {
    return base.startsWith('Rectificación -') ? base : `Rectificación - ${base}`;
  }
  return base;
}

// ==== Mappers ====
function mapEventoToCalendar(ev) {
  const titled = { ...ev, title: prefixTitle(ev) };
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
      partida_id: titled.partida_id,
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
  eventos
    .filter(e => (e.extendedProps?.tipo === 'programacion' || e.extendedProps?.tipo === 'instalacion') && e.extendedProps?.cotizacion_id && e.extendedProps?.partida_id)
    .forEach(e => {
      const pid = e.extendedProps.cotizacion_id;
      const set = asignadasPorProyecto.get(pid) || new Set();
      set.add(e.extendedProps.partida_id);
      asignadasPorProyecto.set(pid, set);
    });

  aprobados.forEach((proj, idx) => {
    const totalPart = proj.partidas?.length || 0;
    const asignadas = asignadasPorProyecto.get(proj.id)?.size || 0;

    const wrap = document.createElement('div');
    wrap.className = 'project-block';

    const header = document.createElement('div');
    header.className = 'project-header';
    header.innerHTML = `
      <div class="project-title">${proj.nombre} <span style="color:#6c7a86;font-size:12px;">(${asignadas}/${totalPart})</span></div>
      <button class="toggle-btn" type="button">Ver partidas</button>
    `;
    const body = document.createElement('div');
    body.className = 'partidas-list';
    body.style.display = 'none'; // CONTRAÍDO POR DEFECTO

    const color = pickColor(idx);

    (proj.partidas || []).forEach(p => {
      const chip = document.createElement('div');
      chip.className = 'chip fc-event';
      chip.draggable = true;
      chip.innerHTML = `<strong>${p.nombre}</strong><span>${proj.cliente?.nombre || proj.cliente?.razon_social || ''}</span>`;
      chip.dataset.payload = JSON.stringify({
        cotizacion_id: proj.id,
        cotizacion_nombre: proj.nombre,
        partida_id: p.id,
        partida_nombre: p.nombre,
        color,
        cliente: proj.cliente?.nombre || proj.cliente?.razon_social || proj.cliente || '',
        tipoDefault: tipoDefault
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
            partida_id: data.partida_id || null,
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

function pickColor(i) {
  const palette = ['#2e5e4e','#3f705d','#1abc9c','#3498db','#9b59b6','#e67e22','#e74c3c','#f1c40f','#95a5a6'];
  return palette[i % palette.length];
}

function renderStats(aprobados, eventos) {
  // Solo cuentan instalaciones/programación (no fabricación)
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
    firstDay: 1, // lunes
    buttonText: { today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día', list: 'Lista' },
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: '' // sin botones de vista
    },
    selectable: false,
    editable: true,
    droppable: true,
    eventReceive: onExternalDrop,
    eventDrop: onEventMoved,
    eventResize: onEventMoved,
    eventClick: onEventClick,
    events: eventosIniciales
  });

  fc.render();
  bindCreateModals();
  bindColorPicker();
  bindTabs();
}

// ==== Tabs ====
function bindTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
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
  fc.setOption('droppable', currentTab === 'instalacion' || currentTab === 'fabricacion');
}

// Drop externo (paleta -> calendario)
async function onExternalDrop(info) {
  try {
    if (!(currentTab === 'instalacion' || currentTab === 'fabricacion')) {
      info.revert && info.revert();
      window.utils?.mostrarNotificacion?.('Solo puedes arrastrar en Instalación o Fabricación', 'warning');
      return;
    }
    const ext = info.event.extendedProps || {};
    const data = info.draggedEl?.dataset?.payload ? JSON.parse(info.draggedEl.dataset.payload) : {};
    const startDate = info.event.start || info.date;
    const tipo = currentTab === 'fabricacion' ? 'fabricacion' : 'programacion';
    const baseTitle = info.event.title || `${data.cotizacion_nombre || 'Proyecto'} - ${data.partida_nombre || 'Partida'}`;
    const payload = {
      cotizacion_id: ext.cotizacion_id || data.cotizacion_id || null,
      partida_id: ext.partida_id || data.partida_id || null,
      tipo,
      title: baseTitle,
      start: startDate ? toIsoDay(startDate) : new Date().toISOString(),
      end: null,
      color: ext.color || data.color || info.event.backgroundColor || '#2e5e4e',
      nota: null,
      cliente: ext.cliente || data.cliente || null
    };
    const ev = await createEvento(payload);
    info.event.remove();
    fc.addEvent(ev);
    refreshStatsAndLists();
  } catch (e) {
    console.error('onExternalDrop error', e);
    window.utils?.mostrarNotificacion?.('Error al crear evento', 'error');
    info.revert && info.revert();
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
  document.getElementById('modalProyecto').textContent = props.cotizacion_id || '—';
  document.getElementById('modalPartida').textContent = props.partida_id || (props.tipo || '—');
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
function bindColorPicker() {
  setColorPicker(selectedColor);
}

function setColorPicker(color) {
  selectedColor = color;
  const picker = document.getElementById('modalColorPicker');
  if (!picker) return;
  picker.innerHTML = '';
  const palette = ['#2e5e4e','#3f705d','#1abc9c','#3498db','#9b59b6','#e67e22','#e74c3c','#f1c40f','#95a5a6'];
  palette.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'color-swatch' + (c === color ? ' active' : '');
    sw.style.background = c;
    sw.onclick = () => {
      selectedColor = c;
      picker.querySelectorAll('.color-swatch').forEach(el => el.classList.remove('active'));
      sw.classList.add('active');
    };
    picker.appendChild(sw);
  });
}

// ==== Modal crear visita/rectificación/compra ====
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
  backdrop.style.display = 'flex';
}

function closeCreateModal() {
  const backdrop = document.getElementById('createBackdrop');
  if (backdrop) backdrop.style.display = 'none';
  createContext = { tipo: 'visita', preDate: null };
}

async function onCreateSave() {
  const proyectoSel = document.getElementById('createProyecto')?.value || '';
  const proyectoText = document.getElementById('createProyecto')?.selectedOptions?.[0]?.text || 'Proyecto';
  if (!proyectoSel) {
    window.utils?.mostrarNotificacion?.('Selecciona un proyecto', 'warning');
    return;
  }
  const tipo = createContext.tipo || 'visita';
  const baseTitle = tipo === 'visita'
    ? `Visita - ${proyectoText}`
    : tipo === 'rectificacion'
      ? `Rectificación - ${proyectoText}`
      : tipo === 'compra'
        ? `COM-${proyectoText}`
        : proyectoText;

  const payload = {
    tipo,
    cotizacion_id: proyectoSel,
    partida_id: null,
    title: baseTitle,
    start: createContext.preDate || new Date().toISOString(),
    end: null,
    color: tipo === 'compra' ? '#e67e22' : '#3f705d',
    nota: null,
    cliente: null
  };
  try {
    const ev = await createEvento(payload);
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
    const ev = mapEventoToCalendar(rowNew);
    fc?.addEvent(ev);
  } else if (eventType === 'UPDATE') {
    const evExist = fc?.getEventById(id);
    if (evExist) evExist.remove();
    const ev = mapEventoToCalendar(rowNew);
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
