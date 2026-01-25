// Mock extendido de proyectos aprobados
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

// Paletas de colores (dos filas)
const colores = [
  "#2e5e4e", "#4a7a9c", "#c15d4f", "#d48b24", "#7a5ac8", "#2b8f7b", "#b04c8c", "#566573", "#9c640c",
  "#1f618d", "#117864", "#8e44ad", "#d68910", "#af7ac5", "#16a085", "#d35400", "#5d6d7e", "#7d6608"
];
let colorSeleccionado = colores[0];

let calendar; // referencia global para el modal
let eventoSeleccionado = null;

// Render color picker (solo modal)
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

// Renderiza la paleta de partidas
function renderPalette() {
  const palette = document.getElementById('palette');
  if (!palette) return;
  palette.innerHTML = '';
  proyectosAprobados.forEach(proj => {
    proj.partidas.forEach(part => {
      const div = document.createElement('div');
      div.className = 'chip fc-event';
      div.setAttribute('data-proyecto', proj.nombre);
      div.setAttribute('data-partida', part.nombre);
      div.setAttribute('data-cliente', proj.cliente);
      div.innerHTML = `<strong>${part.nombre}</strong>
        <small>${proj.nombre}</small>
        <small style="color:#6c7a86;">Cliente: ${proj.cliente}</small>`;
      palette.appendChild(div);
    });
  });
}

// Modal helpers
function abrirModal(evento) {
  eventoSeleccionado = evento;
  const backdrop = document.getElementById('modalBackdrop');
  document.getElementById('modalTitle').textContent = 'Detalle de evento';
  document.getElementById('modalProyecto').textContent = evento.extendedProps.proyecto;
  document.getElementById('modalPartida').textContent = evento.extendedProps.partida;
  document.getElementById('modalCliente').textContent = evento.extendedProps.cliente;
  document.getElementById('modalFecha').textContent = evento.start.toLocaleDateString();
  // pinta color activo del evento
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

// Inicializa el calendario
function initCalendar() {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) return;

  new FullCalendar.Draggable(document.getElementById('palette'), {
    itemSelector: '.fc-event',
    eventData: function(el) {
      return {
        title: `${el.getAttribute('data-partida')} — ${el.getAttribute('data-proyecto')}`,
        extendedProps: {
          proyecto: el.getAttribute('data-proyecto'),
          partida: el.getAttribute('data-partida'),
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
      info.event.setProp('id', `${info.event.id || 'evt'}-${crypto.randomUUID()}`);
      info.event.setProp('backgroundColor', colores[0]);
      info.event.setProp('borderColor', colores[0]);
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
  renderPalette();
  initCalendar();

  // Modal listeners
  document.getElementById('modalClose').addEventListener('click', cerrarModal);
  document.getElementById('modalBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modalBackdrop') cerrarModal();
  });
  document.getElementById('modalDelete').addEventListener('click', () => {
    if (eventoSeleccionado) eventoSeleccionado.remove();
    cerrarModal();
  });
});
