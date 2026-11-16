import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { menuPorRol } from "../config/menu";
import Icono from "./Icono";
import AvatarPerfil from "./AvatarPerfil";

function EnlaceMenu({ opcion, cerrar }) {
  return (
    <NavLink
      key={opcion.ruta}
      to={opcion.ruta}
      onClick={cerrar}
      className={({ isActive }) => `nexdesk-nav-link ${isActive ? "activo" : ""}`}
    >
      <Icono nombre={opcion.icono} tamano={17} />
      <span>{opcion.titulo}</span>
    </NavLink>
  );
}

function EnlaceOperativo({ opcion, cerrar, activo }) {
  return (
    <Link to={opcion.ruta} onClick={cerrar} className={`nexdesk-nav-link ${activo ? "activo" : ""}`} aria-current={activo ? "page" : undefined}>
      <span className="nexdesk-workspace-nav-icon"><Icono nombre={opcion.icono} tamano={16} /></span>
      <span>{opcion.titulo}</span>
      {opcion.etiqueta && <small className="nexdesk-workspace-nav-count">{opcion.etiqueta}</small>}
    </Link>
  );
}

function obtenerVistaEspacio(rol, ubicacion) {
  if (ubicacion.pathname === "/dashboard") {
    return { etiqueta: "PANEL PRINCIPAL", titulo: "Inicio", icono: "dashboard" };
  }

  if (ubicacion.pathname === "/perfil") {
    return { etiqueta: "TU CUENTA", titulo: "Mi perfil", icono: "users" };
  }

  if (ubicacion.pathname === "/cambiar-password") {
    return { etiqueta: "TU CUENTA", titulo: "Cambiar clave", icono: "lock" };
  }

  if (ubicacion.pathname === "/tickets") {
    const estado = new URLSearchParams(ubicacion.search).get("estado") || "todos";
    const vistas = rol === "tecnico"
      ? {
          todos: { etiqueta: "TU BANDEJA DE SOPORTE", titulo: "Mis tickets", icono: "ticket" },
          asignado: { etiqueta: "COLA DE TRABAJO", titulo: "Tickets asignados", icono: "wrench" },
          en_proceso: { etiqueta: "SEGUIMIENTO ACTIVO", titulo: "En atención", icono: "clock" },
          resuelto: { etiqueta: "ARCHIVO DE TICKETS", titulo: "Historial", icono: "chart" },
        }
      : {
          todos: { etiqueta: "SOLICITUDES PERSONALES", titulo: "Mis solicitudes", icono: "ticket" },
          abierto: { etiqueta: "PENDIENTES", titulo: "Solicitudes abiertas", icono: "clock" },
          en_proceso: { etiqueta: "SEGUIMIENTO ACTIVO", titulo: "En atención", icono: "bolt" },
          resuelto: { etiqueta: "ARCHIVO DE TICKETS", titulo: "Historial", icono: "chart" },
        };

    return vistas[estado] || vistas.todos;
  }

  return { etiqueta: "ESPACIO DE TRABAJO", titulo: "Soporte técnico", icono: rol === "tecnico" ? "wrench" : "ticket" };
}

export default function Sidebar({ abierto, cerrar }) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const ubicacion = useLocation();
  const rol = usuario?.rol?.nombre || usuario?.rol;
  const vistaEspacio = obtenerVistaEspacio(rol, ubicacion);
  const opciones = menuPorRol(rol);
  const esAdmin = ["superadmin", "admin"].includes(rol);
  const esOperativo = ["tecnico", "usuario"].includes(rol);
  const opcionesTrabajo = rol === "tecnico"
    ? [
        { titulo: "Inicio", ruta: "/dashboard", icono: "dashboard" },
        { titulo: "Mis tickets", ruta: "/tickets", icono: "ticket" },
        { titulo: "Tickets asignados", ruta: "/tickets?estado=asignado", icono: "ticket" },
        { titulo: "En atención", ruta: "/tickets?estado=en_proceso", icono: "clock" },
        { titulo: "Historial", ruta: "/tickets?estado=resuelto", icono: "chart" },
      ]
    : [
        { titulo: "Inicio", ruta: "/dashboard", icono: "dashboard" },
        { titulo: "Mis solicitudes", ruta: "/tickets", icono: "ticket" },
        { titulo: "Solicitudes abiertas", ruta: "/tickets?estado=abierto", icono: "ticket" },
        { titulo: "En atención", ruta: "/tickets?estado=en_proceso", icono: "clock" },
        { titulo: "Historial", ruta: "/tickets?estado=resuelto", icono: "chart" },
      ];

  function cerrarSesion() {
    sessionStorage.removeItem("nexdesk_mostrar_bienvenida");
    logout();
    navigate("/login", { replace: true });
  }

  function esEnlaceActivo(ruta) {
    const [rutaObjetivo, consultaObjetivo = ""] = ruta.split("?");
    return ubicacion.pathname === rutaObjetivo && ubicacion.search.replace(/^\?/, "") === consultaObjetivo;
  }

  return (
    <>
      {abierto && <button type="button" className="nexdesk-overlay" onClick={cerrar} aria-label="Cerrar menú" />}
      <aside className={`nexdesk-sidebar ${abierto ? "abierto" : ""}`} aria-label="Navegación principal">
        <Link className="nexdesk-sidebar-brand" to="/dashboard" onClick={cerrar}>
          <span className="nexdesk-brand-icon">V</span>
          <span className="nexdesk-brand-copy"><strong>VORTIX</strong><small>Sistema de soporte</small></span>
        </Link>

        {esAdmin ? (
          <nav className="nexdesk-sidebar-nav nexdesk-admin-nav">
            <div className="nexdesk-sidebar-label">Menú principal</div>
            {opciones.filter((opcion) => ["/dashboard", "/tickets"].includes(opcion.ruta)).map((opcion) => <EnlaceMenu key={opcion.ruta} opcion={opcion} cerrar={cerrar} />)}
            <NavLink to="/reportes" onClick={cerrar} className={({ isActive }) => `nexdesk-nav-link ${isActive ? "activo" : ""}`}><Icono nombre="chart" tamano={17} /><span>Reportes</span></NavLink>
            {opciones.filter((opcion) => opcion.ruta === "/seguimientos").map((opcion) => <EnlaceMenu key={opcion.ruta} opcion={opcion} cerrar={cerrar} />)}
            <div className="nexdesk-sidebar-label nexdesk-sidebar-label-separated">Administración</div>
            {opciones.filter((opcion) => ["/usuarios", "/tecnicos", "/categorias"].includes(opcion.ruta)).map((opcion) => <EnlaceMenu key={opcion.ruta} opcion={opcion} cerrar={cerrar} />)}
            <div className="nexdesk-sidebar-label nexdesk-sidebar-label-separated">Cuenta</div>
            <EnlaceMenu opcion={{ titulo: "Mi perfil", ruta: "/perfil", icono: "users" }} cerrar={cerrar} />
          </nav>
        ) : esOperativo ? (
          <>
            <nav className="nexdesk-sidebar-nav nexdesk-workspace-nav">
              <div className="nexdesk-workspace-nav-intro">
                <AvatarPerfil
                  url={usuario?.fotoPerfilUrl}
                  nombre={[usuario?.nombre, usuario?.apellido].filter(Boolean).join(" ") || "Usuario"}
                  className="nexdesk-workspace-nav-intro-avatar"
                />
                <span className="nexdesk-workspace-nav-intro-copy">
                  <small>{vistaEspacio.etiqueta}</small>
                  <strong>{vistaEspacio.titulo}</strong>
                </span>
              </div>
              <div className="nexdesk-sidebar-label">NAVEGACIÓN</div>
              {opcionesTrabajo.map((opcion) => <EnlaceOperativo key={opcion.ruta} opcion={opcion} cerrar={cerrar} activo={esEnlaceActivo(opcion.ruta)} />)}
              <div className="nexdesk-sidebar-label nexdesk-sidebar-label-separated">CUENTA</div>
              <EnlaceOperativo opcion={{ titulo: "Mi perfil", ruta: "/perfil", icono: "users" }} cerrar={cerrar} activo={esEnlaceActivo("/perfil")} />
              <EnlaceOperativo opcion={{ titulo: "Cambiar clave", ruta: "/cambiar-password", icono: "lock" }} cerrar={cerrar} activo={esEnlaceActivo("/cambiar-password")} />
              <button type="button" className="nexdesk-nav-link nexdesk-workspace-logout" onClick={cerrarSesion}>
                <span className="nexdesk-workspace-nav-icon"><Icono nombre="login" tamano={16} /></span>
                <span>Cerrar sesión</span>
              </button>
            </nav>
          </>
        ) : (
          <>
            <div className="nexdesk-sidebar-label">Menú principal</div>
            <nav className="nexdesk-sidebar-nav">
              {opciones.map((opcion) => <EnlaceMenu key={opcion.ruta} opcion={opcion} cerrar={cerrar} />)}
              <EnlaceMenu opcion={{ titulo: "Mi perfil", ruta: "/perfil", icono: "users" }} cerrar={cerrar} />
            </nav>
          </>
        )}

        {esAdmin ? (
          <div className="nexdesk-sidebar-admin-card">
            <span className="nexdesk-admin-crown" aria-hidden="true">♛</span>
            <strong>{rol === "superadmin" ? "Modo Super Admin" : "Modo Admin"}</strong>
            <small>{rol === "superadmin" ? "Acceso total al sistema, gestión de usuarios, roles y configuración." : "Gestiona usuarios, tickets y categorías de soporte."}</small>
          </div>
        ) : esOperativo ? null : (
          <div className="nexdesk-sidebar-footer"><span className="nexdesk-online-dot" />Sistema de soporte<small>Helpdesk organizacional para empresas</small></div>
        )}
      </aside>
    </>
  );
}
