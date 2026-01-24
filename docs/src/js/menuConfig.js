// Menú unificado BYT (los que no tienen href quedan deshabilitados)
window.BYT_MENU = [
  { label: "Proyectos", icon: "folder", href: "" },
  { label: "Cotizaciones", icon: "file", children: [
      { label: "Crear cotización", href: "../cotizaciones/nueva.html" },
      { label: "Administrar cotizaciones", href: "../cotizaciones/consultar.html" }
  ]},
  { label: "Compras", icon: "cart", href: "" },
  { label: "Ventas", icon: "tag", children: [
      { label: "Lista de ventas", href: "../ventas/index.html" },
      { label: "Dashboard ventas", href: "../ventas/dashboard.html" }
  ]},
  { label: "Finanzas", icon: "card", href: "" },
  { label: "Datos", icon: "db", children: [
      { label: "Gestión de Proveedores", href: "../configuracion/proveedores.html" },
      { label: "Gestión de Materiales",  href: "../configuracion/materiales.html" }
  ]},
  { label: "Configuración", icon: "gear", href: "" }
];
