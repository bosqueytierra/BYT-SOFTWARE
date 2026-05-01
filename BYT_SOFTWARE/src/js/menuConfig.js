// Menú unificado BYT (los que no tienen href quedan deshabilitados)
window.BYT_MENU = [
  {
    label: "Cotizaciones",
    icon: "file",
    children: [
      { label: "Crear cotización", href: "../cotizaciones/nueva.html" },
      { label: "Administrar cotizaciones", href: "../cotizaciones/consultar.html" }
    ]
  },
  {
    label: "Ventas",
    icon: "tag",
    children: [
      { label: "Lista de ventas", href: "../ventas/index.html" },
      { label: "Dashboard ventas", href: "../ventas/dashboard.html" }
    ]
  },
  {
    label: "Finanzas",
    icon: "card",
    children: [
      { label: "Contabilidad", href: "../finanzas/contabilidad.html" },
      { label: "Pagos clientes", href: "../finanzas/pagos_clientes.html" },
      { label: "Estado resultados proyectos", href: "../finanzas/proyectos.html" },
      { label: "RR.HH. y sueldos", href: "../finanzas/rrhh_sueldos.html" },
      { label: "Costos operacionales", href: "../finanzas/costos_operacionales.html" },
      { label: "Configuración", href: "../finanzas/configuracion.html" }
    ]
  },
  {
    label: "Proyectos",
    icon: "folder",
    children: [
      { label: "Cronograma de proyectos", href: "../proyectos/cronograma.html" },
      { label: "Estado de proyectos", href: "../proyectos/estado.html" }
    ]
  },
  { label: "Compras", icon: "cart", href: "../compras/index.html" },
  {
    label: "Datos",
    icon: "db",
    children: [
      { label: "Gestión de Proveedores", href: "../configuracion/proveedores.html" },
      { label: "Gestión de Materiales", href: "../configuracion/materiales.html" }
    ]
  },
  { label: "Configuración", icon: "gear", href: "" }
];
