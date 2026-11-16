import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import CampanaNotificaciones from "./CampanaNotificaciones";
import Icono from "./Icono";

export default function NavbarPrincipal({ abrirMenu }) {
  const { usuario, logout, actualizarFotoPerfil, eliminarFotoPerfil } = useAuth();
  const navigate = useNavigate();
  const ubicacion = useLocation();
  const [busqueda, setBusqueda] = useState("");
  const inputBusqueda = useRef(null);
  const inputFotoPerfil = useRef(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [eliminandoFoto, setEliminandoFoto] = useState(false);
  const [mensajeFoto, setMensajeFoto] = useState("");
  const rol = usuario?.rol?.nombre || usuario?.rol;
  const etiquetaRol = rol === "superadmin" ? "Superadministrador" : rol === "admin" ? "Administrador" : rol === "tecnico" ? "T\u00e9cnico" : "Usuario";
  const esAdmin = ["superadmin", "admin"].includes(rol);
  const esOperativo = ["tecnico", "usuario"].includes(rol);
  const mostrarBuscador = esAdmin || esOperativo;
  const estadoVistaTickets = new URLSearchParams(ubicacion.search).get("estado") || "todos";
  const vistasTickets = {
    usuario: {
      todos: { titulo: "Mis solicitudes", descripcion: "Consulta el avance de tus solicitudes de soporte" },
      abierto: { titulo: "Solicitudes abiertas", descripcion: "Solicitudes que esperan iniciar su atención" },
      en_proceso: { titulo: "En atención", descripcion: "Seguimiento de las solicitudes en curso" },
      resuelto: { titulo: "Historial de tickets", descripcion: "Consulta tus solicitudes atendidas y finalizadas" },
    },
    tecnico: {
      todos: { titulo: "Mis tickets", descripcion: "Consulta los tickets asociados a tu trabajo de soporte" },
      asignado: { titulo: "Tickets asignados", descripcion: "Solicitudes listas para iniciar su atención" },
      en_proceso: { titulo: "En atención", descripcion: "Seguimiento de los tickets en curso" },
      resuelto: { titulo: "Historial de tickets", descripcion: "Consulta las solicitudes atendidas y finalizadas" },
    },
  };
  const seccionTicketsActual = esOperativo && ubicacion.pathname === "/tickets"
    ? vistasTickets[rol]?.[estadoVistaTickets]
    : null;
  const esHistorialTickets = esOperativo
    && ubicacion.pathname === "/tickets"
    && estadoVistaTickets === "resuelto";
  const nombreCompleto = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(" ");
  const inicial = usuario?.nombre?.charAt(0)?.toUpperCase() || "U";

  async function seleccionarFoto(evento) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo) return;

    setMensajeFoto("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) {
                <span className="nexdesk-account-action-copy"><strong>{subiendoFoto ? "Guardando foto..." : usuario?.fotoPerfilUrl ? "Cambiar foto" : "Agregar foto"}</strong><small>JPG, PNG o WEBP - max. 2 MB</small></span>
      return;
    }
    if (archivo.size > 2 * 1024 * 1024) {
      setMensajeFoto("La imagen debe pesar máximo 2 MB.");
      return;
    }

    setSubiendoFoto(true);
    try {
      await actualizarFotoPerfil(archivo);
      setMensajeFoto("Foto de perfil actualizada.");
    } catch (error) {
      setMensajeFoto(error.message || "No se pudo actualizar la foto.");
    } finally {
      setSubiendoFoto(false);
    }
  }

  async function quitarFotoPerfil() {
    setMensajeFoto("");
    setEliminandoFoto(true);
    try {
      await eliminarFotoPerfil();
      setMensajeFoto("Foto de perfil eliminada.");
    } catch (error) {
      setMensajeFoto(error.message || "No se pudo eliminar la foto.");
    } finally {
      setEliminandoFoto(false);
    }
  }
  const secciones = {
    "/dashboard": {
      titulo: rol === "tecnico" ? "Panel de Técnico" : rol === "usuario" ? "Portal de soporte" : "Panel de gestión",
      descripcion: rol === "tecnico" ? "Gestión y atención de tickets asignados" : rol === "usuario" ? "Consulta y gestión de tus solicitudes" : "Sistema Integral de Gestión de Soporte Técnico",
    },
    "/perfil": { titulo: "Mi perfil", descripcion: "Consulta y actualiza tus datos personales" },
    "/tickets": { titulo: "Gestión de tickets", descripcion: "Consulta, crea y administra solicitudes de soporte" },
    "/seguimientos": { titulo: "Seguimientos", descripcion: "Historial y trazabilidad de la atención" },
    "/usuarios": { titulo: "Gestión de usuarios", descripcion: "Administración de cuentas, roles y permisos" },
    "/tecnicos": { titulo: "Gestión de técnicos", descripcion: "Administración del equipo de soporte" },
    "/categorias": { titulo: "Categorías", descripcion: "Clasificación de solicitudes de soporte" },
    "/reportes": { titulo: "Reportes y analítica", descripcion: "Indicadores y exportación de tickets" },
  };
  const seccionActual = seccionTicketsActual
    || secciones[ubicacion.pathname]
    || secciones["/dashboard"];
  const buscadores = {
    "/dashboard": { destino: "/tickets", etiqueta: "Buscar tickets", placeholder: "Buscar tickets por ID o descripción..." },
    "/perfil": { destino: "/tickets", etiqueta: "Buscar tickets", placeholder: "Buscar tickets..." },
    "/tickets": { destino: "/tickets", etiqueta: "Buscar tickets", placeholder: "Buscar tickets por ID o descripción..." },
    "/seguimientos": { destino: "/seguimientos", etiqueta: "Buscar seguimientos", placeholder: "Buscar ticket por ID o solicitud..." },
    "/usuarios": { destino: "/usuarios", etiqueta: "Buscar usuarios", placeholder: "Buscar usuarios por nombre o correo..." },
    "/tecnicos": { destino: "/tecnicos", etiqueta: "Buscar técnicos", placeholder: "Buscar técnicos por nombre o especialidad..." },
    "/categorias": { destino: "/categorias", etiqueta: "Buscar categorías", placeholder: "Buscar categorías por nombre..." },
    "/reportes": { destino: "/reportes", etiqueta: "Buscar en reportes", placeholder: "Filtrar tickets del reporte..." },
  };
  const buscadorActual = seccionTicketsActual
    ? {
      destino: estadoVistaTickets === "todos" ? "/tickets" : `/tickets?estado=${encodeURIComponent(estadoVistaTickets)}`,
      etiqueta: esHistorialTickets ? "Buscar en el historial" : `Buscar en ${seccionTicketsActual.titulo.toLowerCase()}`,
      placeholder: esHistorialTickets ? "Buscar en tus tickets finalizados..." : `Buscar en ${seccionTicketsActual.titulo.toLowerCase()}...`,
    }
    : buscadores[ubicacion.pathname] || buscadores["/tickets"];

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBusqueda(new URLSearchParams(ubicacion.search).get("buscar") || "");
  }, [ubicacion.pathname, ubicacion.search]);

  useEffect(() => {
    if (!mostrarBuscador) return undefined;
    function enfocarBusqueda(evento) {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "k") {
        evento.preventDefault();
        inputBusqueda.current?.focus();
      }
    }
    window.addEventListener("keydown", enfocarBusqueda);
    return () => window.removeEventListener("keydown", enfocarBusqueda);
  }, [mostrarBuscador]);

  function cerrarSesion() {
    sessionStorage.removeItem("nexdesk_mostrar_bienvenida");
    logout();
    navigate("/login", { replace: true });
  }

  function buscar(evento) {
    evento.preventDefault();
    const texto = busqueda.trim();
    const [ruta, consultaInicial = ""] = buscadorActual.destino.split("?");
    const parametros = new URLSearchParams(consultaInicial);

    if (texto) {
      parametros.set("buscar", texto);
    } else {
      parametros.delete("buscar");
    }

    const consulta = parametros.toString();
    navigate(consulta ? `${ruta}?${consulta}` : ruta);
  }

  return (
    <header className={`nexdesk-topbar ${esAdmin ? "nexdesk-admin-topbar" : ""} ${esOperativo ? "nexdesk-workspace-topbar" : ""}`}>
      <div className="nexdesk-topbar-left">
        <button type="button" className="btn btn-light nexdesk-menu-toggle" onClick={abrirMenu} aria-label="Abrir menú">☰</button>
        <div className="nexdesk-topbar-title">
          <strong>{seccionActual.titulo}</strong>
          <small>{seccionActual.descripcion}</small>
        </div>
      </div>

      {mostrarBuscador && (
        <form className="nexdesk-global-search" onSubmit={buscar} role="search">
          <Icono nombre="search" tamano={16} />
          <input ref={inputBusqueda} aria-label={buscadorActual.etiqueta} value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder={buscadorActual.placeholder} />
          <kbd>Ctrl + K</kbd>
        </form>
      )}

      <div className="nexdesk-topbar-right">
        <CampanaNotificaciones />
        <div className="dropdown nexdesk-account-dropdown">
          <button className="btn nexdesk-user-menu" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            {usuario?.fotoPerfilUrl ? (
              <img className="nexdesk-avatar nexdesk-avatar-image" src={usuario.fotoPerfilUrl} alt="" />
            ) : (
              <span className="nexdesk-avatar">{inicial}</span>
            )}
            <span className="text-start nexdesk-user-info"><strong>{nombreCompleto || "Usuario"}</strong><small>{etiquetaRol}</small></span>
            <Icono nombre="chevronDown" tamano={15} className="nexdesk-user-chevron" />
          </button>

          <div className="dropdown-menu dropdown-menu-end nexdesk-account-menu">
            <div className="nexdesk-account-summary">
              {usuario?.fotoPerfilUrl ? (
                <img className="nexdesk-avatar nexdesk-avatar-image" src={usuario.fotoPerfilUrl} alt="" />
              ) : (
                <span className="nexdesk-avatar">{inicial}</span>
              )}
              <div className="nexdesk-account-summary-copy">
                <strong>{nombreCompleto || "Usuario"}</strong>
                <span>{usuario?.email}</span>
                <small>{etiquetaRol}</small>
              </div>
            </div>

            <div className="nexdesk-account-group">
              <span className="nexdesk-account-heading">CUENTA</span>
              <Link className="nexdesk-account-action" to="/perfil">
                <span className="nexdesk-account-action-icon"><Icono nombre="users" tamano={17} /></span>
                <span className="nexdesk-account-action-copy"><strong>Mi perfil</strong><small>Ver y actualizar tus datos</small></span>
                <span className="nexdesk-account-action-arrow" aria-hidden="true">&gt;</span>
              </Link>
              <Link className="nexdesk-account-action" to="/cambiar-password">
                <span className="nexdesk-account-action-icon"><Icono nombre="lock" tamano={16} /></span>
                <span className="nexdesk-account-action-copy"><strong>Cambiar clave</strong><small>Actualizar acceso</small></span>
                <span className="nexdesk-account-action-arrow" aria-hidden="true">&gt;</span>
              </Link>
            </div>

            <div className="nexdesk-account-group">
              <span className="nexdesk-account-heading">FOTO DE PERFIL</span>
              <button
                type="button"
                className="nexdesk-account-action"
                disabled={subiendoFoto || eliminandoFoto}
                onClick={(evento) => {
                  evento.stopPropagation();
                  inputFotoPerfil.current?.click();
                }}
              >
                <span className="nexdesk-account-action-icon"><Icono nombre="camera" tamano={17} /></span>
                <span className="nexdesk-account-action-copy"><strong>{subiendoFoto ? "Guardando foto..." : usuario?.fotoPerfilUrl ? "Cambiar foto" : "Agregar foto"}</strong><small>JPG, PNG o WEBP - max. 2 MB</small></span>
              </button>
              <input
                ref={inputFotoPerfil}
                className="d-none"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Seleccionar foto de perfil"
                onClick={(evento) => evento.stopPropagation()}
                onChange={seleccionarFoto}
              />
              {usuario?.fotoPerfilUrl && (
                <button
                  type="button"
                  className="nexdesk-account-action nexdesk-account-action-danger"
                  disabled={subiendoFoto || eliminandoFoto}
                  onClick={(evento) => {
                    evento.stopPropagation();
                    quitarFotoPerfil();
                  }}
                >
                  <span className="nexdesk-account-action-icon"><Icono nombre="trash" tamano={16} /></span>
                  <span className="nexdesk-account-action-copy"><strong>{eliminandoFoto ? "Eliminando foto..." : "Eliminar foto"}</strong><small>Volver a mostrar tu inicial</small></span>
                </button>
              )}
              {mensajeFoto && <p className="nexdesk-foto-feedback" role="status">{mensajeFoto}</p>}
            </div>

            <button type="button" className="nexdesk-account-signout" onClick={cerrarSesion}>
              <Icono nombre="login" tamano={16} />
              <span>{"Cerrar sesi\u00f3n"}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
