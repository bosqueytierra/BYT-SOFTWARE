// TODO: Reemplazar este mock por datos reales desde backend
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

// Paleta de colores (2 filas)
const colores = [
  "#2e5e4e", "#4a7a9c", "#c15d4f", "#d48b24", "#7a5ac8", "#2b8f7b", "#b04c8c", "#566573", "#9c640c",
  "#1f618d", "#117864", "#8e44ad", "#d68910", "#af7ac5", "#16a085", "#d35400", "#5d6d7e", "#7d6608"
];
let colorSeleccionado = colores[0];

let calendar;
let eventoSeleccionado = null;

// Estado de asignación por partida (counts)
const estadoPartidas = {}; // key: projId::partId -> { count }
const colapsados = {};     // recordar expand/colapsar proyectos

// Inicializar estado base
function initEstado() {
  proyectosAprobados.forEach(p => {
    p.partidas.forEach(part => {
      const key = `${p.id}::${part.id}`;
      if (!estadoPartidas[key]) estadoPartidas[key] = { count: 0 };
    });
  });
}

// Contadores globales
function updateStats() {
  const total = Object.keys(estadoPartidas).length;
  const programadas = Object.values(estadoPartidas).filter(x => x.count > 0).length;
  const noProg = total - programadas;
  const elP = document.getElementById('statProgramadas');
  const elN = document.getElementById('statNoProgramadas');
  if (elP) elP.textContent = programadas;
  if (elN) elN.textContent = noProg;
}

// Renderiza la lista de proyectos con partidas e indicadores
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

// Modal helpers
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

function abrirModal(evento) {
  eventoSeleccionado = evento;
  const backdrop = document.getElementById('modalBackdrop');
  document.getElementById('modalTitle').textContent = 'Detalle de evento';
  document.getElementById('modalProyecto').textContent = evento.extendedProps.proyecto;
  document.getElementById('modalPartida').textContent = evento.extendedProps.partida || '(Proyecto completo)';
  document.getElementById('modalCliente').textContent = evento.extendedProps.cliente || '';
  document.getElementById('modalFecha').textContent = evento.start.toLocaleDateString();
  colorSeleccionado = evento.backgroundColor || colores[0];
  renderColorPicker('modalColorPicker', (c) => {
    if (eventoSeleccionado) {
      eventoSeleccionado.setProp('backgroundColor', c);
      eventoSeleccionado.setProp('borderColor', c);
    }
  });
  backdrop.style.display = 'flex';
}
function cerrarModal() {
  const backdrop = document.getElementById('modalBackdrop');
  backdrop.style.display = 'none';
  eventoSeleccionado = null;
}

// Gestiona contador de asignación por partida
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

// Inicializa el calendario
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
            partidas: JSON.parse(el.getAttribute('data-partidas') || '[]')
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
          cliente: el.getAttribute('data-cliente')
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
      // Si es un bundle (proyecto), crear eventos por cada partida
      if (info.event.extendedProps.bundle) {
        const startDate = info.event.start;
        const { partidas, proyecto, proyectoId, cliente } = info.event.extendedProps;
        info.event.remove(); // quitar placeholder
        partidas.forEach(p => {
          const ev = calendar.addEvent({
            title: `${p.nombre} — ${proyecto}`,
            start: startDate,
            allDay: true,
            backgroundColor: colores[0],
            borderColor: colores[0],
            extendedProps: {
              proyecto,
              proyectoId,
              partida: p.nombre,
              partidaId: p.id,
              cliente
            }
          });
          const key = `${proyectoId}::${p.id}`;
          incPartida(key);
        });
        updateStats();
        renderPalette();
        return;
      }
      // Si no es bundle, marcar asignación
      const key = getPartKeyFromEvent(info.event);
      if (key) incPartida(key);
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
  initCalendar();

  document.getElementById('modalClose').addEventListener('click', cerrarModal);
  document.getElementById('modalBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modalBackdrop') cerrarModal();
  });
  document.getElementById('modalDelete').addEventListener('click', () => {
    if (eventoSeleccionado) eventoSeleccionado.remove();
    cerrarModal();
  });

  updateStats();
});
