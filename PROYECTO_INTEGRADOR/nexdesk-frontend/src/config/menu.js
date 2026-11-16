export const MENU = [
  {
    titulo: "Panel de control",
    ruta: "/dashboard",
    icono: "dashboard",
    roles: ["superadmin", "admin", "tecnico", "usuario"],
  },
  {
    titulo: "Tickets",
    ruta: "/tickets",
    icono: "ticket",
    roles: ["superadmin", "admin", "tecnico", "usuario"],
  },
  {
    titulo: "Seguimientos",
    ruta: "/seguimientos",
    icono: "clock",
    roles: ["superadmin", "admin", "tecnico", "usuario"],
  },
  {
    titulo: "Usuarios",
    ruta: "/usuarios",
    icono: "users",
    roles: ["superadmin", "admin"],
  },
  {
    titulo: "Técnicos",
    ruta: "/tecnicos",
    icono: "wrench",
    roles: ["superadmin", "admin"],
  },
  {
    titulo: "Categorías",
    ruta: "/categorias",
    icono: "layers",
    roles: ["superadmin", "admin"],
  },
];

export function menuPorRol(rol) {
  return MENU.filter((opcion) => opcion.roles.includes(rol));
}
