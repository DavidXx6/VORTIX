
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import { useSearchParams } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import Icono from "../components/Icono";

import ModalNuevoTicket from "../components/ModalNuevoTicket";
import ModalAsignarTecnico from "../components/ModalAsignarTecnico";
import ModalEstadoTicket from "../components/ModalEstadoTicket";


import {
    listarTickets,
    crearTicket,
    asignarTecnicoTicket,
    cambiarEstadoTicket,
} from "../services/tickets.service";

import { listarTecnicos } from "../services/tecnicos.service";

import {
    listarCategorias,
} from "../services/categorias.service";

const ESTADOS = [
    ["todos", "Todos"],
    ["abierto", "Abierto"],
    ["asignado", "Asignado"],
    ["en_proceso", "En proceso"],
    ["resuelto", "Resuelto"],
    ["cerrado", "Cerrado"],
    ["reabierto", "Reabierto"],
];

const TRANSICIONES_TICKETS = {
    abierto: [],
    asignado: ["en_proceso"],
    en_proceso: ["resuelto"],
    resuelto: ["cerrado", "reabierto"],
    cerrado: ["reabierto"],
    reabierto: ["en_proceso"],
};

function nombreEstado(estado) {
    return ESTADOS.find(([valor]) => valor === estado)?.[1]
        || estado;
}

function formatearFechaHistorial(fecha) {
    if (!fecha) return "Fecha no disponible";

    const fechaValida = new Date(fecha);

    if (Number.isNaN(fechaValida.getTime())) {
        return "Fecha no disponible";
    }

    return new Intl.DateTimeFormat("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(fechaValida);
}

function claseEstado(estado) {
    const clases = {
        abierto: "text-bg-primary",
        asignado: "text-bg-info",
        en_proceso: "text-bg-warning",
        resuelto: "text-bg-success",
        cerrado: "text-bg-secondary",
        reabierto: "text-bg-danger",
    };

    return clases[estado] || "text-bg-secondary";
}

function clasePrioridad(prioridad) {
    const clases = {
        alta: "text-bg-danger",
        media: "text-bg-warning",
        baja: "text-bg-success",
    };

    return clases[prioridad] || "text-bg-secondary";
}

export default function Tickets() {
    const { token, usuario } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    const [tickets, setTickets] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [tecnicos, setTecnicos] = useState([]);

    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");

    const [busqueda, setBusqueda] = useState(() => searchParams.get("buscar") || "");
    const [filtroEstado, setFiltroEstado] = useState(() => searchParams.get("estado") || "todos");
    const [filtroHistorial, setFiltroHistorial] = useState("todos");

    const [modalNuevo, setModalNuevo] = useState(() => searchParams.get("nuevo") === "1");
    const [guardando, setGuardando] = useState(false);
    const [errorModal, setErrorModal] = useState("");

    const [ticketDetalle, setTicketDetalle] = useState(null);
    const [recarga, setRecarga] = useState(0);

    const [ticketAsignar, setTicketAsignar] = useState(null);
    const [asignando, setAsignando] = useState(false);
    const [errorAsignacion, setErrorAsignacion] = useState("");

    const [ticketCambiarEstado, setTicketCambiarEstado] = useState(null);
    const [cambiandoEstado, setCambiandoEstado] = useState(false);
    const [errorCambioEstado, setErrorCambioEstado] = useState("");

    const rolActual = usuario?.rol?.nombre || usuario?.rol;
    const esAdministrador = ["superadmin", "admin"].includes(rolActual);
    const modoOperativo = ["tecnico", "usuario"].includes(rolActual)
        ? filtroEstado === "resuelto"
            ? "historial"
            : rolActual === "usuario"
                ? ({ todos: "mis-solicitudes", abierto: "abiertas", en_proceso: "atencion" }[filtroEstado] || null)
                : ({ todos: "mis-tickets", asignado: "asignados", en_proceso: "atencion" }[filtroEstado] || null)
        : null;
    const esVistaOperativa = Boolean(modoOperativo);
    const esHistorial = modoOperativo === "historial";

    const configuracionVistas = {
        "mis-solicitudes": { titulo: "Mis solicitudes", descripcion: "Revisa el avance de todo lo que has solicitado.", etiqueta: "TU ESPACIO DE SOPORTE", icono: "ticket" },
        "mis-tickets": { titulo: "Mis tickets", descripcion: "Consulta los tickets asociados a tu trabajo de soporte.", etiqueta: "TU BANDEJA DE SOPORTE", icono: "wrench" },
        abiertas: { titulo: "Solicitudes abiertas", descripcion: "Solicitudes recibidas que todavía esperan iniciar su atención.", etiqueta: "PENDIENTES DE ATENCIÓN", icono: "clock" },
        atencion: { titulo: "En atención", descripcion: "Sigue las solicitudes en las que el equipo ya está trabajando.", etiqueta: "SEGUIMIENTO EN CURSO", icono: "bolt" },
        asignados: { titulo: "Tickets asignados", descripcion: "Solicitudes listas para que inicies su atención.", etiqueta: "TU COLA DE TRABAJO", icono: "layers" },
    };
    const configuracionVista = configuracionVistas[modoOperativo];

    const puedeCrear = ["superadmin", "admin", "usuario"]
        .includes(rolActual);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setBusqueda(searchParams.get("buscar") || "");
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFiltroEstado(searchParams.get("estado") || "todos");
        if (searchParams.get("nuevo") === "1") {
            setModalNuevo(true);
            const siguientes = new URLSearchParams(searchParams);
            siguientes.delete("nuevo");
            setSearchParams(siguientes, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    const actualizar = useCallback(() => {
        setCargando(true);
        setRecarga((valor) => valor + 1);
    }, []);

    // ==========================================
    // 1. CONSULTAR TICKETS Y CATEGORÍAS
    // ==========================================

    useEffect(() => {
        if (!token) return;

        const controlador = new AbortController();

        async function cargar() {
            try {
                const [
                    respuestaTickets,
                    respuestaCategorias,
                    respuestaTecnicos,
                ] = await Promise.all([
                    listarTickets(token, "todos", controlador.signal),
                    listarCategorias(token, controlador.signal),
                    esAdministrador
                        ? listarTecnicos(token, controlador.signal)
                        : Promise.resolve([]),
                ]);

                if (controlador.signal.aborted) return;

                if (!Array.isArray(respuestaTickets)) {
                    throw new Error(
                        "El backend devolvió un formato de tickets inesperado."
                    );
                }

                if (!Array.isArray(respuestaCategorias)) {
                    throw new Error(
                        "El backend devolvió un formato de categorías inesperado."
                    );
                }

                if (!Array.isArray(respuestaTecnicos)) {
                    throw new Error(
                        "El backend devolvió un formato de técnicos inesperado."
                    );
                }

                setTickets(respuestaTickets);
                setCategorias(respuestaCategorias);
                setTecnicos(respuestaTecnicos);
                setError("");
            } catch (err) {
                if (!controlador.signal.aborted) {
                    setError(
                        err.message || "No fue posible cargar los tickets."
                    );
                }
            } finally {
                if (!controlador.signal.aborted) {
                    setCargando(false);
                }
            }
        }

        cargar();

        return () => controlador.abort();
    }, [token, recarga, esAdministrador]);

    // ==========================================
    // 2. NOTIFICACIÓN DE ÉXITO
    // ==========================================

    useEffect(() => {
        if (!mensaje) return;

        const temporizador = setTimeout(() => {
            setMensaje("");
        }, 4000);

        return () => clearTimeout(temporizador);
    }, [mensaje]);

    // ==========================================
    // 3. FILTROS
    // ==========================================

    const filtrados = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();

        return tickets.filter((ticket) => {
            const contenido = [
                ticket.id,
                ticket.titulo,
                ticket.descripcion,
                ticket.prioridad,
                ticket.estado,
            ]
                .filter((valor) => valor !== null && valor !== undefined)
                .join(" ")
                .toLowerCase();

            const coincideEstado = esHistorial
                ? ["resuelto", "cerrado"].includes(ticket.estado)
                : filtroEstado === "todos" || ticket.estado === filtroEstado;

            return contenido.includes(texto) && coincideEstado;
        });
    }, [tickets, busqueda, filtroEstado, esHistorial]);

    const ticketsHistorial = useMemo(() => filtrados
        .filter((ticket) => filtroHistorial === "todos" || ticket.estado === filtroHistorial)
        .sort((a, b) => {
            const fechaA = new Date(a.fecha_cierre || a.fecha_actualizacion || a.fecha_creacion).getTime() || 0;
            const fechaB = new Date(b.fecha_cierre || b.fecha_actualizacion || b.fecha_creacion).getTime() || 0;
            return fechaB - fechaA;
        }), [filtrados, filtroHistorial]);

    const ticketsVistaOrdenados = useMemo(() => [...filtrados].sort((a, b) => {
        const fechaA = new Date(a.fecha_creacion).getTime() || 0;
        const fechaB = new Date(b.fecha_creacion).getTime() || 0;
        return fechaB - fechaA;
    }), [filtrados]);

    const totalResueltos = tickets.filter((ticket) => ticket.estado === "resuelto").length;
    const totalCerrados = tickets.filter((ticket) => ticket.estado === "cerrado").length;
    const totalHistorial = totalResueltos + totalCerrados;
    const totalAbiertos = tickets.filter((ticket) => ticket.estado === "abierto").length;
    const totalEnAtencion = tickets.filter((ticket) => ticket.estado === "en_proceso").length;
    const totalAsignados = tickets.filter((ticket) => ticket.estado === "asignado").length;

    const categoriasActivas = categorias.filter(
        (categoria) => categoria.activa === true
    );

    function nombreCategoria(id) {
        return categorias.find(
            (categoria) => Number(categoria.id) === Number(id)
        )?.nombre || `Categoría #${id}`;
    }

    // ==========================================
    // 4. REGISTRAR TICKET
    // ==========================================

    async function registrarTicket(datos) {
        if (guardando) return;

        setGuardando(true);
        setErrorModal("");

        try {
            await crearTicket(token, datos);

            setModalNuevo(false);
            setMensaje("Ticket registrado correctamente.");
            actualizar();
        } catch (err) {
            setErrorModal(
                err.message || "No fue posible registrar el ticket."
            );
        } finally {
            setGuardando(false);
        }
    }

    // ==========================================
    // 5. ASIGNAR O REASIGNAR TÉCNICO
    // ==========================================

    async function confirmarAsignacion(tecnicoId) {
        if (!ticketAsignar || asignando) return;

        setAsignando(true);
        setErrorAsignacion("");

        try {
            await asignarTecnicoTicket(token, ticketAsignar.id, tecnicoId);
            setTicketAsignar(null);
            setMensaje("Técnico asignado correctamente.");
            actualizar();
        } catch (err) {
            setErrorAsignacion(
                err instanceof Error
                    ? err.message
                    : "No fue posible asignar el técnico."
            );
        } finally {
            setAsignando(false);
        }
    }

    // ==========================================
    // 5.1. OBTENER TÉCNICO ASIGNADO
    // ==========================================

    function obtenerTecnicoAsignado(tecnicoId) {
        if (!tecnicoId) return null;

        return tecnicos.find(
            (tecnico) =>
                Number(tecnico.id) === Number(tecnicoId)
        ) || null;
    }

    // ==========================================
    // 5.2. TRANSICIONES PERMITIDAS
    // ==========================================

    function obtenerTransicionesPermitidas(ticket) {
        if (!ticket) return [];

        const opciones = TRANSICIONES_TICKETS[ticket.estado] || [];

        if (esAdministrador) {
            return opciones;
        }

        if (rolActual === "tecnico") {
            return opciones.filter((estado) =>
                ["en_proceso", "resuelto"].includes(estado)
            );
        }

        return [];
    }

    // ==========================================
    // 5.3. CAMBIAR ESTADO DEL TICKET
    // ==========================================

    async function confirmarCambioEstado(datos) {
        if (!ticketCambiarEstado || cambiandoEstado) return;

        setCambiandoEstado(true);
        setErrorCambioEstado("");

        try {
            await cambiarEstadoTicket(
                token,
                ticketCambiarEstado.id,
                datos.estado,
                datos.solucion
            );

            setTicketCambiarEstado(null);
            setMensaje("Estado del ticket actualizado correctamente.");
            actualizar();
        } catch (err) {
            setErrorCambioEstado(
                err instanceof Error
                    ? err.message
                    : "No fue posible actualizar el estado."
            );
        } finally {
            setCambiandoEstado(false);
        }
    }

    // ==========================================
    // 6. INTERFAZ
    // ==========================================

    return (
        <div className={`container-fluid nexdesk-tickets-page ${esVistaOperativa ? "nexdesk-workspace-tickets-page" : ""} ${esHistorial ? "nexdesk-tickets-history-page" : ""}`}>
            <div className={`nexdesk-tickets-heading d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4 ${esVistaOperativa ? "nexdesk-workspace-ticket-heading" : ""} ${esHistorial ? "nexdesk-history-heading" : ""}`}>
                {esVistaOperativa ? esHistorial ? (
                    <div className="nexdesk-history-page-title">
                        <div className="nexdesk-history-eyebrow"><Icono nombre="clock" tamano={13} /> ARCHIVO DE SOLICITUDES</div>
                        <h1>Historial de tickets</h1>
                        <p>Consulta las solicitudes que ya fueron atendidas y revisa su resultado.</p>
                    </div>
                ) : (
                    <div className={`nexdesk-workspace-ticket-title ${modoOperativo}`}>
                        <div className="nexdesk-workspace-ticket-eyebrow"><Icono nombre={configuracionVista.icono} tamano={13} />{configuracionVista.etiqueta}</div>
                        <h1>{configuracionVista.titulo}</h1>
                        <p>{configuracionVista.descripcion}</p>
                    </div>
                ) : (
                    <div>
                        <div className="small text-secondary mb-1">
                            Inicio / Operación / Tickets
                        </div>

                        <h1 className="h3 fw-bold mb-1">
                            Gestión de tickets
                        </h1>

                        <p className="text-secondary mb-0">
                            Registra, consulta y realiza seguimiento
                            a las solicitudes de soporte técnico.
                        </p>
                    </div>
                )}

                <div className="d-flex gap-2 flex-wrap">
                    <button
                        type="button"
                        className={`btn ${esHistorial ? "nexdesk-history-refresh" : esVistaOperativa ? "nexdesk-workspace-ticket-refresh" : "btn-outline-primary"}`}
                        onClick={actualizar}
                        disabled={cargando}
                    >
                        <Icono nombre={esHistorial ? "clock" : configuracionVista?.icono || "clock"} tamano={14} />
                        {esHistorial ? "Actualizar historial" : esVistaOperativa ? "Actualizar vista" : "Actualizar listado"}
                    </button>

                    {((!esVistaOperativa && puedeCrear) || modoOperativo === "mis-solicitudes") && puedeCrear && (
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => {
                                setErrorModal("");
                                setModalNuevo(true);
                            }}
                            disabled={cargando}
                        >
                            {esVistaOperativa ? "Nueva solicitud" : "+ Nuevo ticket"}
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            {mensaje && (
                <div
                    className="alert alert-success alert-dismissible fade show"
                    role="status"
                >
                    {mensaje}

                    <button
                        type="button"
                        className="btn-close"
                        aria-label="Cerrar mensaje"
                        onClick={() => setMensaje("")}
                    />
                </div>
            )}

            {esVistaOperativa ? esHistorial ? (
                <section className="nexdesk-ticket-history" aria-label="Historial de tickets finalizados">
                    <div className="nexdesk-history-overview">
                        <div className="nexdesk-history-stat nexdesk-history-stat-total">
                            <span className="nexdesk-history-stat-icon"><Icono nombre="layers" tamano={17} /></span>
                            <span><small>Tickets archivados</small><strong>{totalHistorial}</strong></span>
                        </div>
                        <div className="nexdesk-history-stat">
                            <span className="nexdesk-history-stat-icon resolved"><Icono nombre="shield" tamano={17} /></span>
                            <span><small>Resueltos</small><strong>{totalResueltos}</strong></span>
                        </div>
                        <div className="nexdesk-history-stat">
                            <span className="nexdesk-history-stat-icon closed"><Icono nombre="check" tamano={17} /></span>
                            <span><small>Cerrados</small><strong>{totalCerrados}</strong></span>
                        </div>
                    </div>

                    <div className="nexdesk-history-toolbar">
                        <label className="nexdesk-history-search">
                            <Icono nombre="search" tamano={16} />
                            <input
                                type="search"
                                aria-label="Buscar en el historial"
                                value={busqueda}
                                onChange={(evento) => setBusqueda(evento.target.value)}
                                placeholder="Buscar por título, número o descripción..."
                            />
                        </label>
                        <div className="nexdesk-history-filters" role="group" aria-label="Filtrar tickets archivados">
                            {[
                                ["todos", "Todos", totalHistorial],
                                ["resuelto", "Resueltos", totalResueltos],
                                ["cerrado", "Cerrados", totalCerrados],
                            ].map(([valor, etiqueta, cantidad]) => (
                                <button
                                    key={valor}
                                    type="button"
                                    className={filtroHistorial === valor ? "activo" : ""}
                                    aria-pressed={filtroHistorial === valor}
                                    onClick={() => setFiltroHistorial(valor)}
                                >
                                    {etiqueta}<span>{cantidad}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="nexdesk-history-list" aria-live="polite">
                        {cargando ? (
                            <div className="nexdesk-history-empty">
                                <span className="nexdesk-history-empty-icon"><Icono nombre="clock" tamano={20} /></span>
                                <h2>Cargando historial</h2>
                                <p>Estamos organizando tus tickets finalizados.</p>
                            </div>
                        ) : ticketsHistorial.length > 0 ? (
                            ticketsHistorial.map((ticket) => (
                                <article className="nexdesk-history-item" key={ticket.id}>
                                    <span className={`nexdesk-history-marker ${ticket.estado}`} aria-hidden="true">
                                        <Icono nombre={ticket.estado === "cerrado" ? "check" : "shield"} tamano={15} />
                                    </span>
                                    <div className="nexdesk-history-item-main">
                                        <div className="nexdesk-history-item-topline">
                                            <span className="nexdesk-history-ticket-id">TICKET #{ticket.id}</span>
                                            <span className={`nexdesk-history-status ${ticket.estado}`}>
                                                {nombreEstado(ticket.estado)}
                                            </span>
                                        </div>
                                        <h2>{ticket.titulo}</h2>
                                        <p className="nexdesk-history-description">{ticket.descripcion}</p>
                                        {ticket.solucion && (
                                            <div className="nexdesk-history-resolution">
                                                <strong>Solución registrada</strong>
                                                <span>{ticket.solucion}</span>
                                            </div>
                                        )}
                                        <div className="nexdesk-history-item-meta">
                                            <span><Icono nombre="layers" tamano={13} />{nombreCategoria(ticket.categoria_id)}</span>
                                            <span><Icono nombre="bolt" tamano={13} />Prioridad {ticket.prioridad}</span>
                                            <span><Icono nombre="clock" tamano={13} />{formatearFechaHistorial(ticket.fecha_cierre || ticket.fecha_actualizacion || ticket.fecha_creacion)}</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="nexdesk-history-detail-button"
                                        onClick={() => setTicketDetalle(ticket)}
                                    >
                                        Ver detalle <span aria-hidden="true">→</span>
                                    </button>
                                </article>
                            ))
                        ) : (
                            <div className="nexdesk-history-empty">
                                <span className="nexdesk-history-empty-icon"><Icono nombre="chart" tamano={20} /></span>
                                <h2>{busqueda || filtroHistorial !== "todos" ? "No encontramos tickets" : "Aún no hay tickets finalizados"}</h2>
                                <p>{busqueda || filtroHistorial !== "todos" ? "Prueba con otro término o cambia el filtro." : "Cuando una solicitud sea resuelta o cerrada, aparecerá aquí."}</p>
                            </div>
                        )}
                    </div>

                    {!cargando && ticketsHistorial.length > 0 && (
                        <div className="nexdesk-history-footer">
                            Mostrando {ticketsHistorial.length} {ticketsHistorial.length === 1 ? "ticket finalizado" : "tickets finalizados"}
                        </div>
                    )}
                </section>
            ) : (
                <section className={`nexdesk-workspace-tickets-view ${modoOperativo}`} aria-label={configuracionVista.titulo}>
                    {(modoOperativo === "mis-solicitudes" || modoOperativo === "mis-tickets") && (
                        <div className="nexdesk-workspace-ticket-overview">
                            <div className="nexdesk-workspace-ticket-overview-lead">
                                <span className="nexdesk-workspace-ticket-overview-icon"><Icono nombre="layers" tamano={18} /></span>
                                <span><small>{modoOperativo === "mis-tickets" ? "Tickets en tu bandeja" : "Solicitudes registradas"}</small><strong>{tickets.length}</strong></span>
                            </div>
                            <div><small>{modoOperativo === "mis-tickets" ? "Por iniciar" : "Abiertas"}</small><strong>{modoOperativo === "mis-tickets" ? totalAsignados : totalAbiertos}</strong></div>
                            <div><small>En atención</small><strong>{totalEnAtencion}</strong></div>
                            <div><small>Finalizadas</small><strong>{totalHistorial}</strong></div>
                        </div>
                    )}

                    {modoOperativo === "abiertas" && (
                        <div className="nexdesk-open-ticket-banner">
                            <span className="nexdesk-open-ticket-banner-icon"><Icono nombre="clock" tamano={19} /></span>
                            <span><strong>{totalAbiertos} {totalAbiertos === 1 ? "solicitud pendiente" : "solicitudes pendientes"} de asignación</strong><small>Estas solicitudes aún no han comenzado su atención.</small></span>
                            <span className="nexdesk-open-ticket-banner-count">{totalAbiertos}</span>
                        </div>
                    )}

                    {modoOperativo === "atencion" && (
                        <div className="nexdesk-attention-banner">
                            <span className="nexdesk-attention-pulse" />
                            <div><small>SEGUIMIENTO ACTIVO</small><strong>{totalEnAtencion} {totalEnAtencion === 1 ? "ticket en curso" : "tickets en curso"}</strong></div>
                            <p>El equipo de soporte ya está trabajando en estas solicitudes.</p>
                        </div>
                    )}

                    {modoOperativo === "asignados" && (
                        <div className="nexdesk-assigned-queue-heading">
                            <span><small>COLA DE TRABAJO</small><strong>Listos para iniciar</strong></span>
                            <b>{totalAsignados} {totalAsignados === 1 ? "ticket" : "tickets"}</b>
                        </div>
                    )}

                    <div className={`nexdesk-workspace-ticket-tools ${modoOperativo}`}>
                        <span>{ticketsVistaOrdenados.length} {ticketsVistaOrdenados.length === 1 ? "resultado" : "resultados"}</span>
                        <label className="nexdesk-workspace-ticket-search">
                            <Icono nombre="search" tamano={15} />
                            <input
                                type="search"
                                aria-label={`Buscar en ${configuracionVista.titulo.toLowerCase()}`}
                                value={busqueda}
                                onChange={(evento) => setBusqueda(evento.target.value)}
                                placeholder="Buscar en esta vista..."
                            />
                        </label>
                    </div>

                    {cargando ? (
                        <div className="nexdesk-workspace-ticket-empty"><Icono nombre={configuracionVista.icono} tamano={22} /><strong>Cargando solicitudes</strong><span>Actualizando la información de esta vista.</span></div>
                    ) : ticketsVistaOrdenados.length === 0 ? (
                        <div className={`nexdesk-workspace-ticket-empty ${modoOperativo}`}>
                            <Icono nombre={configuracionVista.icono} tamano={22} />
                            <strong>{busqueda ? "No encontramos resultados" : modoOperativo === "abiertas" ? "No tienes solicitudes abiertas" : modoOperativo === "atencion" ? "No hay solicitudes en atención" : modoOperativo === "asignados" ? "Tu cola está al día" : "Aún no tienes solicitudes"}</strong>
                            <span>{busqueda ? "Intenta con otro término de búsqueda." : modoOperativo === "asignados" ? "Cuando te asignen un ticket, aparecerá aquí." : "Las solicitudes que correspondan a esta vista aparecerán aquí."}</span>
                        </div>
                    ) : modoOperativo === "mis-solicitudes" || modoOperativo === "mis-tickets" ? (
                        <div className="nexdesk-workspace-ticket-grid">
                            {ticketsVistaOrdenados.map((ticket) => (
                                <article className="nexdesk-workspace-ticket-card" key={ticket.id}>
                                    <div className="nexdesk-workspace-ticket-card-top">
                                        <span>#{ticket.id} · {nombreCategoria(ticket.categoria_id)}</span>
                                        <span className={`nexdesk-workspace-ticket-status ${ticket.estado}`}>{nombreEstado(ticket.estado)}</span>
                                    </div>
                                    <h2>{ticket.titulo}</h2>
                                    <p>{ticket.descripcion}</p>
                                    <div className="nexdesk-workspace-ticket-card-meta">
                                        <span className={`nexdesk-workspace-priority ${ticket.prioridad}`}>{ticket.prioridad}</span>
                                        <span><Icono nombre="clock" tamano={12} />{formatearFechaHistorial(ticket.fecha_creacion)}</span>
                                    </div>
                                    <div className="nexdesk-workspace-ticket-card-actions">
                                        <button type="button" onClick={() => setTicketDetalle(ticket)}>Ver solicitud</button>
                                        {obtenerTransicionesPermitidas(ticket).length > 0 && (
                                            <button type="button" className="primary" onClick={() => { setErrorCambioEstado(""); setTicketCambiarEstado(ticket); }}>Gestionar</button>
                                        )}
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : modoOperativo === "abiertas" ? (
                        <div className="nexdesk-open-ticket-list">
                            {ticketsVistaOrdenados.map((ticket) => (
                                <article className="nexdesk-open-ticket-row" key={ticket.id}>
                                    <span className="nexdesk-open-ticket-number">#{ticket.id}</span>
                                    <div className="nexdesk-open-ticket-copy">
                                        <div><h2>{ticket.titulo}</h2><span>Esperando asignación</span></div>
                                        <p>{ticket.descripcion}</p>
                                        <small>{nombreCategoria(ticket.categoria_id)} · Creada {formatearFechaHistorial(ticket.fecha_creacion)}</small>
                                    </div>
                                    <span className={`nexdesk-workspace-priority ${ticket.prioridad}`}>{ticket.prioridad}</span>
                                    <button type="button" onClick={() => setTicketDetalle(ticket)}>Ver solicitud <span aria-hidden="true">→</span></button>
                                </article>
                            ))}
                        </div>
                    ) : modoOperativo === "atencion" ? (
                        <div className="nexdesk-attention-list">
                            {ticketsVistaOrdenados.map((ticket) => (
                                <article className="nexdesk-attention-card" key={ticket.id}>
                                    <div className="nexdesk-attention-card-head">
                                        <span>#{ticket.id} · {nombreCategoria(ticket.categoria_id)}</span>
                                        <span className={`nexdesk-workspace-priority ${ticket.prioridad}`}>Prioridad {ticket.prioridad}</span>
                                    </div>
                                    <h2>{ticket.titulo}</h2>
                                    <p>{ticket.descripcion}</p>
                                    <div className="nexdesk-attention-progress" aria-label="Estado: en atención">
                                        <div className="nexdesk-attention-progress-line"><span /></div>
                                        <div className="nexdesk-attention-stages"><span className="completado">Recibida</span><span className="completado">Asignada</span><span className="actual">En atención</span><span>Resuelta</span></div>
                                    </div>
                                    <div className="nexdesk-attention-card-footer">
                                        <span><Icono nombre="clock" tamano={12} />En atención desde {formatearFechaHistorial(ticket.fecha_actualizacion || ticket.fecha_creacion)}</span>
                                        <div>
                                            <button type="button" onClick={() => setTicketDetalle(ticket)}>Ver detalle</button>
                                            {obtenerTransicionesPermitidas(ticket).length > 0 && <button type="button" className="primary" onClick={() => { setErrorCambioEstado(""); setTicketCambiarEstado(ticket); }}>Gestionar estado</button>}
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="nexdesk-assigned-list">
                            {ticketsVistaOrdenados.map((ticket) => (
                                <article className="nexdesk-assigned-ticket" key={ticket.id}>
                                    <div className="nexdesk-assigned-ticket-priority"><span className={`nexdesk-workspace-priority ${ticket.prioridad}`}>{ticket.prioridad}</span><span>ASIGNADO · #{ticket.id}</span></div>
                                    <h2>{ticket.titulo}</h2>
                                    <p>{ticket.descripcion}</p>
                                    <div className="nexdesk-assigned-ticket-meta"><span><Icono nombre="layers" tamano={13} />{nombreCategoria(ticket.categoria_id)}</span><span><Icono nombre="clock" tamano={13} />{formatearFechaHistorial(ticket.fecha_creacion)}</span></div>
                                    <div className="nexdesk-assigned-ticket-actions">
                                        <button type="button" onClick={() => setTicketDetalle(ticket)}>Revisar ticket</button>
                                        {obtenerTransicionesPermitidas(ticket).length > 0 && <button type="button" className="primary" onClick={() => { setErrorCambioEstado(""); setTicketCambiarEstado(ticket); }}>Iniciar atención</button>}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            ) : (
                <>
            {/* INDICADORES */}

            <div className="row g-3 mb-4 nexdesk-ticket-summary">
                {[
                    ["Tickets visibles", tickets.length, "ticket", "blue"],
                    [
                        "Abiertos",
                        tickets.filter((t) => t.estado === "abierto").length,
                        "ticket",
                        "purple",
                    ],
                    [
                        "En proceso",
                        tickets.filter((t) => t.estado === "en_proceso").length,
                        "clock",
                        "amber",
                    ],
                    [
                        "Resueltos",
                        tickets.filter((t) => t.estado === "resuelto").length,
                        "shield",
                        "green",
                    ],
                ].map(([titulo, valor, icono, color]) => (
                    <div className="col-6 col-xl-3" key={titulo}>
                        <div className={`card border-0 shadow-sm h-100 nexdesk-ticket-summary-card ${color}`}>
                            <div className="card-body">
                                <span className="nexdesk-ticket-summary-icon"><Icono nombre={icono} tamano={19} /></span>
                                <div><div className="small text-secondary">{titulo}</div><div className="h3 fw-bold mb-0 mt-1">{valor}</div></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* DIRECTORIO */}

            <div className="card border-0 shadow-sm rounded-4 nexdesk-tickets-directory">
                <div className="card-body">
                    <div className="nexdesk-tickets-directory-title"><div><span><Icono nombre="ticket" tamano={16} /></span><h2>Tickets disponibles</h2></div><small>Usa los filtros para encontrar una solicitud.</small></div>
                    <div className="row g-3 mb-3">
                        <div className="col-md-8">
                            <label
                                htmlFor="buscar-ticket"
                                className="form-label"
                            >
                                Buscar ticket
                            </label>

                            <input
                                id="buscar-ticket"
                                className="form-control"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="ID, título, descripción o prioridad"
                            />
                        </div>

                        <div className="col-md-4">
                            <label
                                htmlFor="filtro-ticket"
                                className="form-label"
                            >
                                Estado
                            </label>

                            <select
                                id="filtro-ticket"
                                className="form-select"
                                value={filtroEstado}
                                onChange={(e) => setFiltroEstado(e.target.value)}
                            >
                                {ESTADOS.map(([valor, etiqueta]) => (
                                    <option key={valor} value={valor}>
                                        {etiqueta}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="table table-hover align-middle">
                            <thead className="nexdesk-tickets-table-head">
                                <tr>
                                    <th>ID</th>
                                    <th>Solicitud</th>
                                    <th>Categoría</th>
                                    <th>Prioridad</th>
                                    <th>Estado</th>
                                    <th>Técnico</th>
                                    <th className="text-end">Acciones</th>
                                </tr>
                            </thead>

                            <tbody>
                                {cargando && (
                                    <tr>
                                        <td colSpan={7} className="text-center py-4">
                                            Consultando tickets...
                                        </td>
                                    </tr>
                                )}

                                {!cargando &&
                                    filtrados.map((ticket) => (
                                        <tr key={ticket.id}>
                                            <td className="fw-semibold">
                                                #{ticket.id}
                                            </td>

                                            <td>
                                                <div className="fw-semibold">
                                                    {ticket.titulo}
                                                </div>
                                                <div
                                                    className="small text-secondary text-truncate"
                                                    style={{ maxWidth: 280 }}
                                                >
                                                    {ticket.descripcion}
                                                </div>
                                            </td>

                                            <td>
                                                {nombreCategoria(ticket.categoria_id)}
                                            </td>

                                            <td>
                                                <span
                                                    className={`badge ${clasePrioridad(
                                                        ticket.prioridad
                                                    )}`}
                                                >
                                                    {ticket.prioridad}
                                                </span>
                                            </td>

                                            <td>
                                                <span
                                                    className={`badge ${claseEstado(
                                                        ticket.estado
                                                    )}`}
                                                >
                                                    {nombreEstado(ticket.estado)}
                                                </span>
                                            </td>

                                            <td>
                                                {ticket.tecnico_id ? (
                                                    (() => {
                                                        const tecnico = obtenerTecnicoAsignado(
                                                            ticket.tecnico_id
                                                        );

                                                        if (!tecnico) {
                                                            return (
                                                                <span className="text-secondary small">
                                                                    Técnico #{ticket.tecnico_id}
                                                                </span>
                                                            );
                                                        }

                                                        return (
                                                            <div>
                                                                <div className="fw-semibold">
                                                                    {tecnico.nombre} {tecnico.apellido}
                                                                </div>
                                                                <div className="small text-secondary">
                                                                    {tecnico.especialidad || "Sin especialidad"}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()
                                                ) : (
                                                    <span className="text-secondary">
                                                        Sin asignar
                                                    </span>
                                                )}
                                            </td>

                                            <td className="text-end">
                                                <div className="d-flex justify-content-end gap-2 flex-wrap">
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-primary"
                                                        onClick={() => setTicketDetalle(ticket)}
                                                    >
                                                        Ver detalle
                                                    </button>

                                                    {esAdministrador &&
                                                        ["abierto", "asignado", "reabierto"].includes(ticket.estado) && (
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-success"
                                                                onClick={() => {
                                                                    setErrorAsignacion("");
                                                                    setTicketAsignar(ticket);
                                                                }}
                                                            >
                                                                {ticket.tecnico_id ? "Reasignar" : "Asignar"}
                                                            </button>
                                                        )}

                                                    {obtenerTransicionesPermitidas(ticket).length > 0 && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-primary"
                                                            onClick={() => {
                                                                setErrorCambioEstado("");
                                                                setTicketCambiarEstado(ticket);
                                                            }}
                                                        >
                                                            Gestionar estado
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                {!cargando && filtrados.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="text-center text-secondary py-4"
                                        >
                                            No se encontraron tickets.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="small text-secondary">
                        Mostrando {filtrados.length} de {tickets.length} tickets.
                    </div>
                </div>
            </div>

                </>
            )}

            {/* REGISTRO */}

            {(!esVistaOperativa || modoOperativo === "mis-solicitudes") && modalNuevo && (
                <ModalNuevoTicket
                    categorias={categoriasActivas}
                    guardando={guardando}
                    error={errorModal}
                    onGuardar={registrarTicket}
                    onCerrar={() => {
                        if (!guardando) {
                            setModalNuevo(false);
                            setErrorModal("");
                        }
                    }}
                />
            )}

            {/* ASIGNACIÓN DE TÉCNICO */}
            {!esVistaOperativa && ticketAsignar && (
                <ModalAsignarTecnico
                    key={ticketAsignar.id}
                    ticket={ticketAsignar}
                    tecnicos={tecnicos}
                    guardando={asignando}
                    error={errorAsignacion}
                    onGuardar={confirmarAsignacion}
                    onCerrar={() => {
                        if (!asignando) {
                            setTicketAsignar(null);
                            setErrorAsignacion("");
                        }
                    }}
                />
            )}

            {/* CAMBIO DE ESTADO */}
            {(!esVistaOperativa || ["mis-tickets", "atencion", "asignados"].includes(modoOperativo)) && ticketCambiarEstado && (
                <ModalEstadoTicket
                    key={ticketCambiarEstado.id}
                    ticket={ticketCambiarEstado}
                    transiciones={obtenerTransicionesPermitidas(ticketCambiarEstado)}
                    guardando={cambiandoEstado}
                    error={errorCambioEstado}
                    onGuardar={confirmarCambioEstado}
                    onCerrar={() => {
                        if (!cambiandoEstado) {
                            setTicketCambiarEstado(null);
                            setErrorCambioEstado("");
                        }
                    }}
                />
            )}

            {/* DETALLE */}

            {ticketDetalle && (
                <>
                    <div
                        className="modal d-block"
                        tabIndex={-1}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="titulo-detalle-ticket"
                        style={{ zIndex: 1060 }}
                    >
                        <div className="modal-dialog modal-dialog-centered modal-lg">
                            <div className="modal-content rounded-4">
                                <div className="modal-header">
                                    <h2
                                        id="titulo-detalle-ticket"
                                        className="modal-title h5"
                                    >
                                        Ticket #{ticketDetalle.id}
                                    </h2>

                                    <button
                                        type="button"
                                        className="btn-close"
                                        aria-label="Cerrar"
                                        onClick={() => setTicketDetalle(null)}
                                    />
                                </div>

                                <div className="modal-body">
                                    <h3 className="h5">
                                        {ticketDetalle.titulo}
                                    </h3>

                                    <p style={{ whiteSpace: "pre-wrap" }}>
                                        {ticketDetalle.descripcion}
                                    </p>

                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <strong>Prioridad:</strong>{" "}
                                            {ticketDetalle.prioridad}
                                        </div>

                                        <div className="col-md-6">
                                            <strong>Estado:</strong>{" "}
                                            {nombreEstado(ticketDetalle.estado)}
                                        </div>

                                        <div className="col-md-6">
                                            <strong>Categoría:</strong>{" "}
                                            {nombreCategoria(
                                                ticketDetalle.categoria_id
                                            )}
                                        </div>

                                        <div className="col-md-6">
                                            <strong>Técnico responsable:</strong>

                                            {ticketDetalle.tecnico_id ? (
                                                (() => {
                                                    const tecnico = obtenerTecnicoAsignado(
                                                        ticketDetalle.tecnico_id
                                                    );

                                                    return tecnico ? (
                                                        <div className="mt-1">
                                                            <div className="fw-semibold">
                                                                {tecnico.nombre} {tecnico.apellido}
                                                            </div>
                                                            <div className="small text-secondary">
                                                                {tecnico.especialidad || "Sin especialidad"}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-secondary mt-1">
                                                            Técnico #{ticketDetalle.tecnico_id}
                                                        </div>
                                                    );
                                                })()
                                            ) : (
                                                <div className="text-secondary mt-1">
                                                    Sin asignar
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {ticketDetalle.solucion && (
                                        <div className="alert alert-success mt-3 mb-0">
                                            <strong>Solución registrada</strong>
                                            <p
                                                className="mb-0 mt-2"
                                                style={{ whiteSpace: "pre-wrap" }}
                                            >
                                                {ticketDetalle.solucion}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={() => setTicketDetalle(null)}
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        className="modal-backdrop show"
                        style={{ zIndex: 1055 }}
                    />
                </>
            )}
        </div>
    );
}
