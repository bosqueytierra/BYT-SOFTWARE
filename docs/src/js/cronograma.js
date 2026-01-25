// Mock de proyectos aprobados (sustituir por backend real si corresponde)
const proyectosAprobados = [
  { id: "proj-001", nombre: "Proyecto Bahía - Pocket Door", cliente: "Terrazio", partidas: [
    { id: "p1", nombre: "Excavación" }, { id: "p2", nombre: "Cimentación" }, { id: "p3", nombre: "Estructura" }
  ]},
  { id: "proj-002", nombre: "Proyecto Lago - Ventanas", cliente: "ACME", partidas: [
    { id: "p4", nombre: "Enmarcado" }, { id: "p5", nombre: "Instalación vidrios" }
  ]},
  { id: "proj-003", nombre: "Proyecto Andes - Interior", cliente: "Cliente XYZ", partidas: [
    { id: "p6", nombre: "Tabiquería" }, { id: "p7", nombre: "Pintura" }, { id: "p8", nombre: "Terminaciones" }
  ]},
  { id: "proj-004", nombre: "Proyecto Pacífico - Fachada", cliente: "Inmobiliaria Alfa", partidas: [
    { id: "p9", nombre: "Revestimiento" }, { id: "p10", nombre: "Sellos" }
  ]},
  { id: "proj-005", nombre: "Proyecto Delta - Equipamiento", cliente: "Retail Beta", partidas: [
    { id: "p11", nombre: "Mobiliario" }, { id: "p12", nombre: "Iluminación" }
  ]},
  { id: "proj-006", nombre: "Proyecto Sierra - Estructural", cliente: "Constructora Gamma", partidas: [
    { id: "p13", nombre: "Hormigonado" }, { id: "p14", nombre: "Acero" }
  ]},
  { id: "proj-007", nombre: "Proyecto Norte - Climatización", cliente: "Cliente Norte", partidas: [
    { id: "p15", nombre: "Ductos" }, { id: "p16", nombre: "Equipos" }
  ]},
  { id: "proj-008", nombre: "Proyecto Sur - Paisajismo", cliente: "Cliente Sur", partidas: [
    { id: "p17", nombre: "Riego" }, { id: "p18", nombre: "Vegetación" }
  ]}
];

// Paleta de colores (8 distintos, sin repetir)
const colores = [
  "#2e5e4e", // verde bosque
  "#4a7a9c", // azul acero
  "#c15d4f", // rojo terracota
  "#d48b24", // ámbar
  "#7a5ac8", // violeta
  "#2b8f7b", // verde azulado
  "#b04c8c", // magenta
  "#566573"  // gris pizarra
];
let colorSeleccionado = colores[0];

let calendar;
let eventoSeleccionado = null;

const estadoPartidas = {}; // key: projId::partId -> { count }
const colapsados = {};
const visitasItems = [];
const rectItems = [];

// Helpers de título con nota
function buildTitle({ partida, proyecto, tipo, nota }) {
  const base = partida ? `${partida} — ${proyecto}` : tipo ? `${tipo}${proyecto ? ' — ' + proyecto : ''}` : proyecto || '';
  const note = nota ? ` (${nota})` : '';
  return base + note;
}

function initEstado() {
  proyectosAprobados.forEach(p => {
    p.partidas.forEach(part => {
      const key = `${p.id}::${part.id}`;
      if (!estadoPartidas[key]) estadoPartidas[key] = { count: 0 };
    });
  });
}

function updateStats() {
  const total = Object.keys(estadoPartidas).length;
  const programadas = Object.values(estadoPartidas).filter(x => x.count > 0).length;
  const noProg = total - programadas;
  const elP = document.getElementById('statProgramadas');
  const elN = document.getElementById('statNoProgramadas');
  if (elP) elP.textContent = programadas;
  if (elN) elN.textContent = noProg;
}

function renderPalette() {
  const palette = document.getElementById('palette');
  if (!palette) return;
  palette.innerHTML = '';

  proyectosAprobados.forEach(proj => {
    const totalPart = proj.partidas.length;
    const asignadas = proj.partidas.reduce((acc, part) => {
      const k = `${proj.id}::${part.id}`;
      return acc + (estadoPartidas[k]?.count > 0 ? 1 : 0);
    }, 0);
    const projectAssigned = asignadas === totalPart && totalPart > 0;

    const block = document.createElement('div');
    block.className = 'project-block';

    const header = document.createElement('div');
    header.className = 'project-header fc-event';
    header.setAttribute('data-bundle', '1');
    header.setAttribute('data-proyecto', proj.nombre);
    header.setAttribute('data-proyecto-id', proj.id);
    header.setAttribute('data-cliente', proj.cliente);
    header.setAttribute('data-partidas', JSON.stringify(proj.partidas));
    header.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;">
        <span class="dot ${projectAssigned ? 'assigned' : 'unassigned'}"></span>
        <span class="project-title">${proj.nombre}</span>
        <span style="color:#6c7a86;font-size:12px;">(${asignadas}/${totalPart})</span>
      </div>
      <button class="toggle-btn" type="button">${colapsados[proj.id] ? 'Ocultar' : 'Desplegar'}</button>
    `;

    const list = document.createElement('div');
    list.className = 'partidas-list';
    list.style.display = colapsados[proj.id] ? 'grid' : 'none';

    proj.partidas.forEach(part => {
      const key = `${proj.id}::${part.id}`;
      const asignada = estadoPartidas[key]?.count > 0;
      const div = document.createElement('div');
      div.className = 'chip fc-event';
      div.setAttribute('data-proyecto', proj.nombre);
      div.setAttribute('data-proyecto-id', proj.id);
      div.setAttribute('data-partida', part.nombre);
      div.setAttribute('data-partida-id', part.id);
      div.setAttribute('data-cliente', proj.cliente);
      div.innerHTML = `<div style="display:flex;align-items:center;gap:6px;">
          <span class="dot ${asignada ? 'assigned' : 'unassigned'}"></span>
          <strong>${part.nombre}</strong>
        </div>
        <small>${proj.nombre}</small>
        <small style="color:#6c7a86;">Cliente: ${proj.cliente}</small>`;
      list.appendChild(div);
    });

    header.querySelector('.toggle-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const visible = list.style.display !== 'none';
      list.style.display = visible ? 'none' : 'grid';
      e.target.textContent = visible ? 'Desplegar' : 'Ocultar';
      colapsados[proj.id] = !visible;
    });

    block.appendChild(header);
    block.appendChild(list);
    palette.appendChild(block);
  });
}

function renderExtras() {
  const vList = document.getElementById('visitasList');
  const rList = document.getElementById('rectList');
  if (vList) {
    vList.innerHTML = '';
    visitasItems.forEach(item => {
      const div = document.createElement('div');
      div.className = 'chip fc-event';
      div.setAttribute('data-tipo', 'Visita técnica');
      div.setAttribute('data-proyecto', item.proyectoNombre || '(Manual)');
      div.setAttribute('data-proyecto-id', item.proyectoId || '');
      div.setAttribute('data-cliente', item.cliente || '');
      div.setAttribute('data-titulo', item.titulo);
      div.innerHTML = `<strong>${item.titulo}</strong>
        <small>${item.proyectoNombre || 'Manual'}</small>
        ${item.cliente ? `<small style="color:#6c7a86;">Cliente: ${item.cliente}</small>` : ''}`;
      vList.appendChild(div);
    });
  }
  if (rList) {
    rList.innerHTML = '';
    rectItems.forEach(item => {
      const div = document.createElement('div');
      div.className = 'chip fc-event';
      div.setAttribute('data-tipo', 'Rectificación');
      div.setAttribute('data-proyecto', item.proyectoNombre || '(Manual)');
      div.setAttribute('data-proyecto-id', item.proyectoId || '');
      div.setAttribute('data-cliente', item.cliente || '');
      div.setAttribute('data-titulo', item.titulo);
      div.innerHTML = `<strong>${item.titulo}</strong>
        <small>${item.proyectoNombre || 'Manual'}</small>
        ${item.cliente ? `<small style="color:#6c7a86;">Cliente: ${item.cliente}</small>` : ''}`;
      rList.appendChild(div);
    });
  }
}

// Color picker modal
function renderColorPicker(containerId, onSelect) {
  const picker = document.getElementById(containerId);
  if (!picker) return;
  picker.innerHTML = '';
  colores.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'color-swatch' + (c === colorSeleccionado ? ' active' : '');
    sw.style.background = c;
    sw.addEventListener('click', () => {
      colorSeleccionado = c;
      renderColorPicker(containerId, onSelect);
      if (typeof onSelect === 'function') onSelect(c);
    });
    picker.appendChild(sw);
  });
}

// Modal info evento
function abrirModal(evento) {
  eventoSeleccionado = evento;
  document.getElementById('modalProyecto').textContent = evento.extendedProps.proyecto;
  document.getElementById('modalPartida').textContent = evento.extendedProps.partida || evento.extendedProps.tipo || '(Proyecto completo)';
  document.getElementById('modalCliente').textContent = evento.extendedProps.cliente || '';
  document.getElementById('modalFecha').textContent = evento.start.toLocaleDateString();
  const nota = evento.extendedProps.note || '';
  document.getElementById('modalNota').value = nota;

  colorSeleccionado = evento.backgroundColor || colores[0];
  renderColorPicker('modalColorPicker', (c) => {
    if (eventoSeleccionado) {
      eventoSeleccionado.setProp('backgroundColor', c);
      eventoSeleccionado.setProp('borderColor', c);
    }
  });

  document.getElementById('modalBackdrop').style.display = 'flex';
}
function cerrarModal() {
  document.getElementById('modalBackdrop').style.display = 'none';
  eventoSeleccionado = null;
}

// Modal crear visita/rectificación
let createTipo = null;
function abrirCreateModal(tipo) {
  createTipo = tipo;
  document.getElementById('createTitle').textContent = tipo === 'visita' ? 'Agregar visita técnica' : 'Agregar rectificación';
  document.getElementById('createNombre').value = '';
  document.getElementById('createCliente').value = '';
  document.getElementById('createProyecto').value = '';
  document.getElementById('createBackdrop').style.display = 'flex';
}
function cerrarCreateModal() {
  document.getElementById('createBackdrop').style.display = 'none';
  createTipo = null;
}
function cargarSelectProyectos() {
  const sel = document.getElementById('createProyecto');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Seleccionar --</option>';
  proyectosAprobados.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.nombre;
    sel.appendChild(opt);
  });
}

// Asignación contadores
function incPartida(key) {
  if (!estadoPartidas[key]) estadoPartidas[key] = { count: 0 };
  estadoPartidas[key].count++;
}
function decPartida(key) {
  if (!estadoPartidas[key]) estadoPartidas[key] = { count: 0 };
  estadoPartidas[key].count = Math.max(estadoPartidas[key].count - 1, 0);
}
function getPartKeyFromEvent(ev) {
  const p = ev.extendedProps;
  if (p.proyectoId && p.partidaId) return `${p.proyectoId}::${p.partidaId}`;
  return null;
}

// Init calendario
function initCalendar() {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) return;

  new FullCalendar.Draggable(document.getElementById('palette'), {
    itemSelector: '.fc-event',
    eventData: function(el) {
      const isBundle = el.getAttribute('data-bundle') === '1';
      if (isBundle) {
        return {
          title: el.getAttribute('data-proyecto'),
          extendedProps: {
            bundle: true,
            proyecto: el.getAttribute('data-proyecto'),
            proyectoId: el.getAttribute('data-proyecto-id'),
            cliente: el.getAttribute('data-cliente'),
            partidas: JSON.parse(el.getAttribute('data-partidas') || '[]'),
            note: ''
          },
          duration: { days: 1 },
          color: colores[0],
          backgroundColor: colores[0],
          borderColor: colores[0]
        };
      }
      return {
        title: `${el.getAttribute('data-partida')} — ${el.getAttribute('data-proyecto')}`,
        extendedProps: {
          proyecto: el.getAttribute('data-proyecto'),
          proyectoId: el.getAttribute('data-proyecto-id'),
          partida: el.getAttribute('data-partida'),
          partidaId: el.getAttribute('data-partida-id'),
          cliente: el.getAttribute('data-cliente'),
          note: ''
        },
        duration: { days: 1 },
        color: colores[0],
        backgroundColor: colores[0],
        borderColor: colores[0]
      };
    }
  });

  new FullCalendar.Draggable(document.getElementById('visitasList'), {
    itemSelector: '.fc-event',
    eventData: function(el) {
      return {
        title: el.getAttribute('data-titulo'),
        extendedProps: {
          tipo: 'Visita técnica',
          proyecto: el.getAttribute('data-proyecto'),
          proyectoId: el.getAttribute('data-proyecto-id'),
          cliente: el.getAttribute('data-cliente'),
          note: ''
        },
        duration: { days: 1 },
        color: colores[0],
        backgroundColor: colores[0],
        borderColor: colores[0]
      };
    }
  });

  new FullCalendar.Draggable(document.getElementById('rectList'), {
    itemSelector: '.fc-event',
    eventData: function(el) {
      return {
        title: el.getAttribute('data-titulo'),
        extendedProps: {
          tipo: 'Rectificación',
          proyecto: el.getAttribute('data-proyecto'),
          proyectoId: el.getAttribute('data-proyecto-id'),
          cliente: el.getAttribute('data-cliente'),
          note: ''
        },
        duration: { days: 1 },
        color: colores[0],
        backgroundColor: colores[0],
        borderColor: colores[0]
      };
    }
  });

  calendar = new FullCalendar.Calendar(calendarEl, {
    locale: 'es',
    buttonText: { today: 'hoy', month: 'mes', week: 'semana', day: 'día' },
    initialView: 'dayGridMonth',
    height: '100%',
    droppable: true,
    editable: true,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    eventReceive: function(info) {
      // bundle proyecto -> generar eventos por partida
      if (info.event.extendedProps.bundle) {
        const startDate = info.event.start;
        const { partidas, proyecto, proyectoId, cliente } = info.event.extendedProps;
        info.event.remove();
        partidas.forEach(p => {
          calendar.addEvent({
            title: buildTitle({ partida: p.nombre, proyecto }),
            start: startDate,
            allDay: true,
            backgroundColor: colores[0],
            borderColor: colores[0],
            extendedProps: {
              proyecto,
              proyectoId,
              partida: p.nombre,
              partidaId: p.id,
              cliente,
              note: ''
            }
          });
          const key = `${proyectoId}::${p.id}`;
          incPartida(key);
        });
        updateStats();
        renderPalette();
        return;
      }
      // partida individual
      if (info.event.extendedProps.partidaId) {
        const key = getPartKeyFromEvent(info.event);
        if (key) incPartida(key);
      }
      info.event.setProp('id', `${info.event.id || 'evt'}-${crypto.randomUUID()}`);
      info.event.setProp('backgroundColor', colores[0]);
      info.event.setProp('borderColor', colores[0]);
      updateStats();
      renderPalette();
    },
    eventRemove: function(info) {
      const key = getPartKeyFromEvent(info.event);
      if (key) decPartida(key);
      updateStats();
      renderPalette();
    },
    eventDidMount: function(arg) {
      const el = arg.el;
      el.style.position = 'relative';
      const btn = document.createElement('span');
      btn.textContent = '🗑';
      btn.title = 'Eliminar';
      btn.style.position = 'absolute';
      btn.style.right = '4px';
      btn.style.top = '2px';
      btn.style.cursor = 'pointer';
      btn.style.fontSize = '12px';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        arg.event.remove();
      });
      el.appendChild(btn);
    },
    eventClick: function(info) {
      abrirModal(info.event);
    }
  });

  calendar.render();
}

document.addEventListener('DOMContentLoaded', () => {
  initEstado();
  renderPalette();
  renderExtras();
  initCalendar();
  updateStats();
  cargarSelectProyectos();

  // Modal info
  document.getElementById('modalClose').addEventListener('click', cerrarModal);
  document.getElementById('modalBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modalBackdrop') cerrarModal();
  });
  document.getElementById('modalDelete').addEventListener('click', () => {
    if (eventoSeleccionado) eventoSeleccionado.remove();
    cerrarModal();
  });
  document.getElementById('modalSave').addEventListener('click', () => {
    if (!eventoSeleccionado) return;
    const nota = document.getElementById('modalNota').value.trim();
    eventoSeleccionado.setExtendedProp('note', nota);
    const ep = eventoSeleccionado.extendedProps;
    const newTitle = buildTitle({ partida: ep.partida, proyecto: ep.proyecto, tipo: ep.tipo, nota });
    eventoSeleccionado.setProp('title', newTitle);
    cerrarModal();
  });

  // Modal crear visita/rectificación
  document.getElementById('btnAddVisita').addEventListener('click', () => abrirCreateModal('visita'));
  document.getElementById('btnAddRect').addEventListener('click', () => abrirCreateModal('rectificacion'));
  document.getElementById('createCancel').addEventListener('click', cerrarCreateModal);
  document.getElementById('createBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'createBackdrop') cerrarCreateModal();
  });
  document.getElementById('createSave').addEventListener('click', () => {
    const sel = document.getElementById('createProyecto');
    const nombre = document.getElementById('createNombre').value.trim();
    const clienteIn = document.getElementById('createCliente').value.trim();
    const projId = sel.value;
    const proj = proyectosAprobados.find(p => p.id === projId);
    const proyectoNombre = proj ? proj.nombre : '';
    const cliente = clienteIn || (proj ? proj.cliente : '');
    const tituloBase = createTipo === 'visita' ? 'Visita técnica' : 'Rectificación';
    const titulo = nombre || (proyectoNombre ? `${tituloBase} — ${proyectoNombre}` : tituloBase);

    const item = {
      id: crypto.randomUUID(),
      titulo,
      proyectoId: projId || '',
      proyectoNombre: proyectoNombre || '',
      cliente
    };
    if (createTipo === 'visita') visitasItems.push(item);
    else rectItems.push(item);

    renderExtras();
    cerrarCreateModal();
  });
});
