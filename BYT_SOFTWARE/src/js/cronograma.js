// Mock de proyectos aprobados con partidas
const proyectosAprobados = [
  {
    id: "proj-001",
    nombre: "Proyecto Bahía - Pocket Door",
    cliente: "Terrazio",
    partidas: [
      { id: "p1", nombre: "Excavación", duracion: 1 },
      { id: "p2", nombre: "Cimentación", duracion: 2 },
      { id: "p3", nombre: "Estructura", duracion: 2 }
    ]
  },
  {
    id: "proj-002",
    nombre: "Proyecto Lago - Ventanas",
    cliente: "ACME",
    partidas: [
      { id: "p4", nombre: "Enmarcado", duracion: 1 },
      { id: "p5", nombre: "Instalación vidrios", duracion: 1 }
    ]
  },
  {
    id: "proj-003",
    nombre: "Proyecto Andes - Interior",
    cliente: "Cliente XYZ",
    partidas: [
      { id: "p6", nombre: "Tabiquería", duracion: 1 },
      { id: "p7", nombre: "Pintura", duracion: 1 }
    ]
  }
];

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
      div.setAttribute('data-duration', part.duracion || 1);
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

  // Habilita los elementos externos como draggables (FullCalendar v6 global)
  new FullCalendar.Draggable(document.getElementById('palette'), {
    itemSelector: '.fc-event',
    eventData: function(el) {
      // Cada drop debe clonar un id único
      return {
        title: `${el.getAttribute('data-partida')} — ${el.getAttribute('data-proyecto')}`,
        extendedProps: {
          proyecto: el.getAttribute('data-proyecto'),
          partida: el.getAttribute('data-partida')
        },
        duration: { days: Number(el.getAttribute('data-duration') || 1) }
      };
    }
  });

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    height: 'auto',
    droppable: true,
    editable: true,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    drop: function(info) {
      // Cada drop genera un evento con ID único (ya lo hace FullCalendar al recibir)
      // Si se quisiera impedir quitar del palette, no removemos nada
    },
    eventReceive: function(info) {
      // Garantiza ID único en cada recepción
      info.event.setProp('id', `${info.event.id || 'evt'}-${crypto.randomUUID()}`);
    },
    eventClick: function(info) {
      const p = info.event.extendedProps;
      alert(`Proyecto: ${p.proyecto}\nPartida: ${p.partida}\nFecha: ${info.event.start.toLocaleDateString()}`);
    }
  });

  calendar.render();
}

document.addEventListener('DOMContentLoaded', () => {
  renderPalette();
  initCalendar();
});
