// Mock de proyectos aprobados con partidas
const proyectosAprobados = [
  {
    id: "proj-001",
    nombre: "Proyecto Bahía - Pocket Door",
    cliente: "Terrazio",
    partidas: [
      { id: "p1", nombre: "Excavación" },
      { id: "p2", nombre: "Cimentación" },
      { id: "p3", nombre: "Estructura" }
    ]
  },
  {
    id: "proj-002",
    nombre: "Proyecto Lago - Ventanas",
    cliente: "ACME",
    partidas: [
      { id: "p4", nombre: "Enmarcado" },
      { id: "p5", nombre: "Instalación vidrios" }
    ]
  },
  {
    id: "proj-003",
    nombre: "Proyecto Andes - Interior",
    cliente: "Cliente XYZ",
    partidas: [
      { id: "p6", nombre: "Tabiquería" },
      { id: "p7", nombre: "Pintura" }
    ]
  }
];

// Colores disponibles para asignar a eventos
const colores = [
  "#2e5e4e", "#4a7a9c", "#c15d4f", "#d48b24", "#7a5ac8",
  "#2b8f7b", "#b04c8c", "#566573", "#9c640c"
];
let colorSeleccionado = colores[0];

// Renderiza selector de colores
function renderColorPicker() {
  const picker = document.getElementById('colorPicker');
  if (!picker) return;
  picker.innerHTML = '';
  colores.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'color-swatch' + (c === colorSeleccionado ? ' active' : '');
    sw.style.background = c;
    sw.addEventListener('click', () => {
      colorSeleccionado = c;
      renderColorPicker();
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

function initCalendar() {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) return;

  // Habilita arrastrables externos
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
        duration: { days: 1 }, // ocupa un día
        color: colorSeleccionado,
        backgroundColor: colorSeleccionado,
        borderColor: colorSeleccionado
      };
    }
  });

  const calendar = new FullCalendar.Calendar(calendarEl, {
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
    drop: function() {
      // No removemos de la paleta
    },
    eventReceive: function(info) {
      // ID único y color seleccionado al soltar
      info.event.setProp('id', `${info.event.id || 'evt'}-${crypto.randomUUID()}`);
      info.event.setProp('backgroundColor', colorSeleccionado);
      info.event.setProp('borderColor', colorSeleccionado);
    },
    eventDidMount: function(arg) {
      // Añade botón de eliminar en cada evento
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
      // Al hacer clic, aplica el color seleccionado al evento
      info.event.setProp('backgroundColor', colorSeleccionado);
      info.event.setProp('borderColor', colorSeleccionado);
    }
  });

  calendar.render();
}

document.addEventListener('DOMContentLoaded', () => {
  renderColorPicker();
  renderPalette();
  initCalendar();
});
