import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import ToastBienvenida from "../components/ToastBienvenida";
import Icono from "../components/Icono";
import { listarTickets } from "../services/tickets.service";
import { listarTecnicos } from "../services/tecnicos.service";

const ESTADOS = [
  { clave: "abierto", nombre: "Abiertos", color: "#3688ff" },
  { clave: "asignado", nombre: "Asignados", color: "#24d7ec" },
  { clave: "en_proceso", nombre: "En atención", color: "#aa68ff" },
  { clave: "resuelto", nombre: "Resueltos", color: "#36d78a" },
  { clave: "cerrado", nombre: "Cerrados", color: "#f45b71" },
  { clave: "reabierto", nombre: "Reabiertos", color: "#f2ac48" },
];

function nombreRol(rol) {
  return rol === "superadmin" ? "Super Administrador" : "Administrador";
}

function nombreEstado(estado) {
  return ESTADOS.find((item) => item.clave === estado)?.nombre || estado || "Sin estado";
}

function fechaCorta(fecha) {
  if (!fecha) return "Sin fecha";
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return "Sin fecha";
  return valor.toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function nombreTecnicoAsignado(id, tecnicos) {
  if (!id) return "Sin asignar";
  const tecnico = tecnicos.find((item) => Number(item.id) === Number(id));
  return tecnico
    ? [tecnico.nombre, tecnico.apellido].filter(Boolean).join(" ")
    : `Técnico ${id}`;
}

function exportarTickets(tickets) {
  const escapar = (valor) => `"${String(valor ?? "").replace(/"/g, '""')}"`;
  const filas = [
    ["ID", "Título", "Estado", "Prioridad", "Técnico", "Fecha"],
    ...tickets.map((ticket) => [
      `#TK-${String(ticket.id).padStart(4, "0")}`,
      ticket.titulo,
      nombreEstado(ticket.estado),
      ticket.prioridad,
      ticket.tecnico_id ? `Técnico ${ticket.tecnico_id}` : "Sin asignar",
      fechaCorta(ticket.fecha_creacion),
    ]),
  ];
  const archivo = new Blob(
    ["\uFEFF", filas.map((fila) => fila.map(escapar).join(";" )).join("\r\n")],
    { type: "text/csv;charset=utf-8;" }
  );
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `VORTIX_reporte_${new Date().toLocaleDateString("sv-SE")}.csv`;
  enlace.click();
  URL.revokeObjectURL(url);
}

function LaptopDecorativa() {
  return (
    <svg className="nexdesk-hero-laptop" viewBox="0 0 280 190" role="img" aria-label="Ilustración de un portátil VORTIX">
      <defs>
        <linearGradient id="laptopScreen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#15285d" />
          <stop offset="1" stopColor="#060b20" />
        </linearGradient>
        <linearGradient id="laptopBase" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9cbcff" />
          <stop offset=".48" stopColor="#477de8" />
          <stop offset="1" stopColor="#252d76" />
        </linearGradient>
        <linearGradient id="laptopGlow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#31e7ff" />
          <stop offset="1" stopColor="#a15bff" />
        </linearGradient>
        <filter id="softGlow"><feGaussianBlur stdDeviation="7" /></filter>
      </defs>
      <ellipse cx="150" cy="151" rx="112" ry="18" fill="#3429cc" opacity=".65" filter="url(#softGlow)" />
      <ellipse cx="149" cy="150" rx="108" ry="19" fill="none" stroke="url(#laptopGlow)" strokeWidth="2" opacity=".85" transform="rotate(-10 149 150)" />
      <ellipse cx="151" cy="149" rx="88" ry="12" fill="none" stroke="#31cfff" strokeWidth="1.5" opacity=".65" transform="rotate(12 151 149)" />
      <path d="M104 37 212 67a7 7 0 0 1 5 8l-18 68-112-33 17-68a7 7 0 0 1 0 0Z" fill="#101738" stroke="#a9b8ff" strokeWidth="3" />
      <path d="m108 43 99 28-15 58-99-29 15-57Z" fill="url(#laptopScreen)" />
      <rect x="130" y="72" width="40" height="40" rx="12" fill="#5c41fa" transform="rotate(16 150 92)" />
      <text x="150" y="102" textAnchor="middle" fill="white" fontSize="28" fontWeight="800" fontFamily="Arial, sans-serif">V</text>
      <path d="m82 113 117 34 40 18a5 5 0 0 1-2 9l-137-9-67-31a5 5 0 0 1 1-9l48-12Z" fill="url(#laptopBase)" stroke="#b2c8ff" strokeWidth="2" />
      <path d="m96 119 83 24-16 13-91-24 24-13Z" fill="#233c91" opacity=".9" />
      <path d="m131 133 23 7-8 5-23-7 8-5Z" fill="#aec5ff" opacity=".85" />
      <path d="M44 142 27 152" stroke="#30dfff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="27" cy="152" r="3" fill="#30dfff" />
    </svg>
  );
}

function ActividadTickets({ tickets, rango, campoFecha = "fecha_creacion" }) {
  const datos = useMemo(() => {
    const hoy = new Date();
    const cantidadDias = Number(rango) === 30 ? 30 : 7;
    const inicioPeriodo = new Date(hoy);
    inicioPeriodo.setDate(hoy.getDate() - (cantidadDias - 1));
    inicioPeriodo.setHours(0, 0, 0, 0);
    const dias = Array.from({ length: 7 }, (_, indice) => {
      const fecha = new Date(inicioPeriodo);
      fecha.setDate(inicioPeriodo.getDate() + Math.floor((indice * cantidadDias) / 7));
      const siguiente = new Date(fecha);
      siguiente.setDate(inicioPeriodo.getDate() + Math.floor(((indice + 1) * cantidadDias) / 7));
      const total = tickets.filter((ticket) => {
        const creada = new Date(ticket[campoFecha] || ticket.fecha_creacion);
        return !Number.isNaN(creada.getTime()) && creada >= fecha && creada < siguiente;
      }).length;
      return {
        etiqueta: fecha.toLocaleDateString("es-CO", { day: "numeric", month: "short" }).replace(".", ""),
        total,
      };
    });
    const maximo = Math.max(4, ...dias.map((dia) => dia.total));
    const puntos = dias.map((dia, indice) => ({
      x: 26 + indice * 83,
      y: 112 - (dia.total / maximo) * 88,
      ...dia,
    }));
    const linea = puntos.map((punto, indice) => `${indice ? "L" : "M"} ${punto.x} ${punto.y}`).join(" ");
    const area = `${linea} L ${puntos.at(-1).x} 116 L ${puntos[0].x} 116 Z`;
    return { puntos, linea, area, maximo };
  }, [tickets, rango, campoFecha]);

  return (
    <div className="nexdesk-activity-chart">
      <svg viewBox="0 0 525 145" role="img" aria-label="Tickets creados durante los últimos siete días">
        <defs>
          <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a364ff" stopOpacity=".3" />
            <stop offset="1" stopColor="#a364ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[24, 46, 68, 90, 112].map((y, index) => (
          <g key={y}>
            <line x1="26" y1={y} x2="520" y2={y} stroke="#293352" strokeWidth="1" />
            <text x="4" y={y + 3} fill="#8290b0" fontSize="9">{Math.round(datos.maximo * (4 - index) / 4)}</text>
          </g>
        ))}
        <path d={datos.area} fill="url(#activityFill)" />
        <path d={datos.linea} fill="none" stroke="#b06aff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {datos.puntos.map((punto) => (
          <g key={punto.etiqueta}>
            <circle cx={punto.x} cy={punto.y} r="4" fill="#d8a9ff" stroke="#171936" strokeWidth="2" />
            <text x={punto.x} y="137" textAnchor="middle" fill="#aab5d0" fontSize="9">{punto.etiqueta}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function DashboardAdministrativo({ usuario, tickets, tecnicos, cargando, error, onActualizar, mostrarBienvenida, cerrarBienvenida }) {
  const [periodoEstado, setPeriodoEstado] = useState("mes");
  const [periodoActividad, setPeriodoActividad] = useState("7");
  const resumen = useMemo(() => {
    const estados = ESTADOS.map((estado) => ({
      ...estado,
      cantidad: tickets.filter((ticket) => ticket.estado === estado.clave).length,
    }));
    const activos = tickets.filter((ticket) => !["cerrado", "resuelto"].includes(ticket.estado)).length;
    return {
      estados,
      total: tickets.length,
      activos,
      resueltos: estados.find((estado) => estado.clave === "resuelto")?.cantidad || 0,
      cerrados: estados.find((estado) => estado.clave === "cerrado")?.cantidad || 0,
    };
  }, [tickets]);

  const estadosDelPeriodo = useMemo(() => {
    const limite = new Date();
    if (periodoEstado === "mes") {
      limite.setDate(1);
    } else {
      limite.setDate(limite.getDate() - 7);
    }
    limite.setHours(0, 0, 0, 0);
    const ticketsFiltrados = tickets.filter((ticket) => {
      const fecha = new Date(ticket.fecha_creacion);
      return !Number.isNaN(fecha.getTime()) && fecha >= limite;
    });
    return {
      total: ticketsFiltrados.length,
      estados: ESTADOS.map((estado) => ({
        ...estado,
        cantidad: ticketsFiltrados.filter((ticket) => ticket.estado === estado.clave).length,
      })),
    };
  }, [tickets, periodoEstado]);

  const totalSegmentos = estadosDelPeriodo.estados.reduce((total, estado) => total + estado.cantidad, 0);
  let angulo = 0;
  const segmentos = estadosDelPeriodo.estados.map((estado) => {
    const inicio = angulo;
    angulo += totalSegmentos ? (estado.cantidad / totalSegmentos) * 360 : 0;
    return `${estado.color} ${inicio}deg ${angulo}deg`;
  });
  const fondoDonut = totalSegmentos
    ? `conic-gradient(${segmentos.join(", ")})`
    : "conic-gradient(#293653 0deg 360deg)";
  const recientes = [...tickets]
    .sort((a, b) => new Date(b.fecha_creacion || 0) - new Date(a.fecha_creacion || 0))
    .slice(0, 3);
  const nombre = usuario?.nombre?.split(" ")[0] || "usuario";
  const pendientes = resumen.activos;
  const estadoGestion = pendientes
    ? `${pendientes} ${pendientes === 1 ? "ticket requiere" : "tickets requieren"} seguimiento`
    : "Operación al día";
  const bandejaAdminVacia = cargando
    ? {
        titulo: "Cargando actividad reciente",
        descripcion: "Estamos reuniendo los tickets visibles del sistema.",
      }
    : {
        titulo: "Aún no hay tickets recientes",
        descripcion: "Cuando se creen solicitudes, podrás supervisarlas desde este espacio.",
      };

  return (
    <div className="nexdesk-admin-dashboard">
      <section className="nexdesk-welcome-panel">
        <div className="nexdesk-welcome-copy">
          <span className="nexdesk-role-pill"><span aria-hidden="true">♛</span>{nombreRol(usuario?.rol)}</span>
          <h1>¡Hola, {nombre}! <span aria-hidden="true">👋</span></h1>
          <p>Gestiona, supervisa y controla todo el sistema VORTIX desde un solo lugar.</p>
          <div className="nexdesk-welcome-links">
            <Link to="/usuarios"><span aria-hidden="true">◈</span> Gestión total</Link>
            <Link to="/usuarios"><span aria-hidden="true">♙</span> Control de usuarios</Link>
            <Link to="/tickets"><span aria-hidden="true">▣</span> Supervisión de tickets</Link>
            <Link to="/reportes"><span aria-hidden="true">▥</span> Reportes y analítica</Link>
          </div>
        </div>
        <LaptopDecorativa />
      </section>

      {error && <div className="nexdesk-admin-error" role="alert">No se pudieron cargar los tickets: {error}</div>}

      <section className="nexdesk-stat-grid" aria-label="Resumen de tickets">
        {[
          { titulo: "Tickets visibles", valor: resumen.total, icono: "▣", color: "purple", estado: "todos" },
          { titulo: "En atención / pendientes", valor: resumen.activos, icono: "⌛", color: "amber", estado: null },
          { titulo: "Resueltos", valor: resumen.resueltos, icono: "✓", color: "green", estado: "resuelto" },
          { titulo: "Cerrados", valor: resumen.cerrados, icono: "×", color: "red", estado: "cerrado" },
        ].map((item) => (
          <Link className={`nexdesk-stat-card ${item.color}`} to={item.estado ? `/tickets?estado=${item.estado}` : "/tickets"} key={item.titulo}>
            <span className="nexdesk-stat-icon" aria-hidden="true">{item.icono}</span>
            <span className="nexdesk-stat-text">
              <span className="nexdesk-stat-title">{item.titulo}</span>
              <strong>{cargando && !tickets.length ? "…" : item.valor}</strong>
              <small><span>•</span> Datos actualizados</small>
            </span>
            <svg className="nexdesk-stat-spark" viewBox="0 0 70 28" aria-hidden="true"><path d="M1 24 C 12 21, 12 20, 22 22 S 33 15, 41 17 S 53 6, 60 12 S 65 8, 69 4" /></svg>
          </Link>
        ))}
      </section>

      <section className="nexdesk-dashboard-charts" id="reportes">
        <article className="nexdesk-panel nexdesk-status-panel">
          <div className="nexdesk-panel-heading">
            <h2><span aria-hidden="true">▣</span> Tickets por estado</h2>
            <select aria-label="Período del reporte" value={periodoEstado} onChange={(evento) => setPeriodoEstado(evento.target.value)}>
              <option value="semana">Esta semana</option>
              <option value="mes">Este mes</option>
            </select>
          </div>
          <div className="nexdesk-status-content">
            <div className="nexdesk-donut" style={{ background: fondoDonut }}>
              <div><strong>{estadosDelPeriodo.total}</strong><span>Tickets</span></div>
            </div>
            <div className="nexdesk-status-legend">
              {estadosDelPeriodo.estados.slice(0, 5).map((estado) => (
                <div key={estado.clave}>
                  <span className="nexdesk-legend-dot" style={{ background: estado.color }} />
                  <span>{estado.nombre}</span>
                  <strong>{estado.cantidad}</strong>
                  <small>{estadosDelPeriodo.total ? Math.round((estado.cantidad / estadosDelPeriodo.total) * 100) : 0}%</small>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="nexdesk-panel nexdesk-activity-panel">
          <div className="nexdesk-panel-heading">
            <h2>Actividad de tickets</h2>
            <div className="nexdesk-chart-actions">
              <button type="button" onClick={onActualizar} disabled={cargando} title="Actualizar datos" aria-label="Actualizar datos">↻</button>
              <select aria-label="Período de actividad" value={periodoActividad} onChange={(evento) => setPeriodoActividad(evento.target.value)}>
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
              </select>
            </div>
          </div>
          <ActividadTickets tickets={tickets} rango={periodoActividad} />
          <div className="nexdesk-admin-activity-caption">
            <span><i aria-hidden="true" />{tickets.length ? "Datos actualizados desde los tickets visibles" : "Aún no hay actividad registrada"}</span>
            <small>{tickets.length ? "Explora otros periodos para comparar la tendencia." : "La actividad aparecerá aquí cuando se creen tickets."}</small>
          </div>
        </article>
      </section>

      <section className="nexdesk-dashboard-bottom">
        <article className="nexdesk-panel nexdesk-recent-panel">
          <div className="nexdesk-panel-heading">
            <h2><span aria-hidden="true">▣</span> Tickets recientes</h2>
            <Link to="/tickets">Ver todos <span aria-hidden="true">→</span></Link>
          </div>
          {recientes.length ? (
            <div className="nexdesk-table-wrap">
              <table className="nexdesk-recent-table">
                <thead><tr><th># Ticket</th><th>Título</th><th>Estado</th><th>Asignado a</th><th>Fecha</th><th /></tr></thead>
                <tbody>
                  {recientes.map((ticket) => (
                    <tr key={ticket.id}>
                      <td><span className="nexdesk-ticket-id">#TK-{String(ticket.id).padStart(4, "0")}</span></td>
                      <td className="nexdesk-ticket-title">{ticket.titulo}</td>
                      <td><span className={`nexdesk-ticket-state ${ticket.estado}`}>{nombreEstado(ticket.estado)}</span></td>
                      <td><span className="nexdesk-assignee"><span>{ticket.tecnico_id ? "T" : "—"}</span>{nombreTecnicoAsignado(ticket.tecnico_id, tecnicos)}</span></td>
                      <td>{fechaCorta(ticket.fecha_creacion)}</td>
                      <td><Link to={`/tickets?buscar=${encodeURIComponent(ticket.titulo || ticket.id)}`} aria-label={`Ver ticket ${ticket.id}`}>•••</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="nexdesk-admin-empty-state">
              <span>▣</span>
              <h3>{bandejaAdminVacia.titulo}</h3>
              <p>{bandejaAdminVacia.descripcion}</p>
              {!cargando && <Link to="/tickets?nuevo=1">Crear el primer ticket <span aria-hidden="true">→</span></Link>}
            </div>
          )}
        </article>

        <article className="nexdesk-panel nexdesk-quick-panel">
          <div className="nexdesk-panel-heading"><h2><span aria-hidden="true">ϟ</span> Acciones rápidas</h2></div>
          <div className="nexdesk-quick-actions">
            <Link to="/tickets?nuevo=1" className="primary"><span aria-hidden="true">＋</span>Nuevo ticket</Link>
            <Link to="/usuarios?nuevo=1"><span aria-hidden="true">♙</span>Crear usuario</Link>
            <button type="button" onClick={() => exportarTickets(tickets)} disabled={!tickets.length}><span aria-hidden="true">▥</span>Generar reporte</button>
          </div>
          <div className={`nexdesk-admin-actions-status ${pendientes ? "has-pending" : ""}`}>
            <span>{pendientes ? "◷" : "✓"}</span>
            <div>
              <small>Estado del sistema</small>
              <strong>{estadoGestion}</strong>
              <p>{pendientes ? "Revisa la cola de tickets para sostener los tiempos de atención." : "No hay solicitudes pendientes de atención."}</p>
            </div>
          </div>
        </article>
      </section>
      {mostrarBienvenida && <ToastBienvenida nombre={usuario?.nombre?.split(" ")[0] || "usuario"} onCerrar={cerrarBienvenida} />}
    </div>
  );
}

function DashboardOperativo({ usuario, tickets, cargando, error, onActualizar, mostrarBienvenida, cerrarBienvenida }) {
  const [periodoActividad, setPeriodoActividad] = useState("7");
  const rol = usuario?.rol?.nombre || usuario?.rol;
  const esTecnico = rol === "tecnico";
  const nombre = usuario?.nombre?.split(" ")[0] || (esTecnico ? "técnico" : "usuario");
  const ticketsRecientes = [...tickets]
    .sort((a, b) => new Date(b.fecha_actualizacion || b.fecha_creacion || 0) - new Date(a.fecha_actualizacion || a.fecha_creacion || 0))
    .slice(0, 3);
  const resumen = useMemo(() => ({
    total: tickets.length,
    asignados: tickets.filter((ticket) => ticket.estado === "asignado").length,
    atencion: tickets.filter((ticket) => ["asignado", "en_proceso", "reabierto"].includes(ticket.estado)).length,
    resueltos: tickets.filter((ticket) => ticket.estado === "resuelto").length,
    cerrados: tickets.filter((ticket) => ticket.estado === "cerrado").length,
  }), [tickets]);

  const indicadores = esTecnico
    ? [
        { titulo: "Tickets asignados", valor: resumen.total, icono: "ticket", color: "blue", ruta: "/tickets" },
        { titulo: "En atención", valor: resumen.atencion, icono: "clock", color: "purple", ruta: "/tickets?estado=en_proceso" },
        { titulo: "Resueltos", valor: resumen.resueltos, icono: "shield", color: "green", ruta: "/tickets?estado=resuelto" },
      ]
    : [
        { titulo: "Mis solicitudes", valor: resumen.total, icono: "ticket", color: "blue", ruta: "/tickets" },
        { titulo: "En atención", valor: resumen.atencion, icono: "clock", color: "purple", ruta: "/tickets?estado=en_proceso" },
        { titulo: "Resueltas", valor: resumen.resueltos + resumen.cerrados, icono: "shield", color: "green", ruta: "/tickets?estado=resuelto" },
      ];

  const acciones = esTecnico
    ? [
        { texto: "Ver asignados", icono: "ticket", ruta: "/tickets?estado=asignado", principal: true },
        { texto: "Actualizar estado", icono: "wrench", ruta: "/tickets?estado=en_proceso" },
        { texto: "Registrar solución", icono: "shield", ruta: "/tickets?estado=en_proceso" },
      ]
    : [
        { texto: "Nueva solicitud", icono: "plus", ruta: "/tickets?nuevo=1", principal: true },
        { texto: "Mis solicitudes", icono: "ticket", ruta: "/tickets" },
        { texto: "Ver historial", icono: "chart", ruta: "/tickets?estado=resuelto" },
      ];
  const bandejaVacia = cargando
    ? {
        titulo: "Preparando tu bandeja",
        descripcion: "Estamos consultando los tickets disponibles para ti.",
        accion: null,
      }
    : esTecnico
      ? {
          titulo: "Tu bandeja está al día",
          descripcion: "No tienes tickets asignados por ahora. Los nuevos casos aparecerán aquí.",
          accion: { texto: "Ver mis tickets", ruta: "/tickets" },
        }
      : {
          titulo: "Aún no tienes solicitudes",
          descripcion: "Cuando necesites ayuda, crea una solicitud y podrás hacerle seguimiento desde aquí.",
          accion: { texto: "Crear solicitud", ruta: "/tickets?nuevo=1" },
        };
  const pendientes = resumen.atencion;
  const estadoJornada = pendientes
    ? `${pendientes} ${pendientes === 1 ? "ticket requiere" : "tickets requieren"} atención`
    : "Bandeja al día";

  return (
    <div className="nexdesk-workspace-dashboard">
      <section className="nexdesk-workspace-hero">
        <div className="nexdesk-workspace-hero-copy">
          <span className="nexdesk-workspace-role"><Icono nombre={esTecnico ? "wrench" : "users"} tamano={13} />{esTecnico ? "Técnico" : "Usuario"}</span>
          <h1>¡Hola, {nombre}! <span aria-hidden="true">👋</span></h1>
          <p>{esTecnico ? "Gestiona, atiende y da solución a los tickets asignados." : "Crea, consulta y da seguimiento a tus solicitudes de soporte."}</p>
        </div>
        <LaptopDecorativa />
      </section>

      {error && <div className="nexdesk-workspace-error" role="alert">No se pudieron cargar tus tickets: {error}</div>}

      <section className="nexdesk-workspace-stats" aria-label="Resumen de tickets">
        {indicadores.map((indicador) => (
          <Link key={indicador.titulo} to={indicador.ruta} className={`nexdesk-workspace-stat ${indicador.color}`}>
            <span className="nexdesk-workspace-stat-icon"><Icono nombre={indicador.icono} tamano={22} /></span>
            <span><small>{indicador.titulo}</small><strong>{cargando && !tickets.length ? "…" : indicador.valor}</strong></span>
            <em>↗</em>
          </Link>
        ))}
      </section>

      <section className="nexdesk-workspace-main-grid">
        <article className="nexdesk-workspace-panel nexdesk-workspace-tickets-panel">
          <div className="nexdesk-workspace-panel-heading">
            <h2><Icono nombre="ticket" tamano={15} />{esTecnico ? "Mis tickets asignados" : "Mis solicitudes recientes"}</h2>
            <Link to="/tickets">Ver todos <span aria-hidden="true">→</span></Link>
          </div>
          {ticketsRecientes.length ? (
            <div className="nexdesk-workspace-table-wrap">
              <table className="nexdesk-workspace-table">
                <thead><tr><th># Ticket</th><th>Título</th><th>Prioridad</th><th>Estado</th></tr></thead>
                <tbody>
                  {ticketsRecientes.map((ticket) => (
                    <tr key={ticket.id}>
                      <td><span className="nexdesk-ticket-id">#TK-{String(ticket.id).padStart(4, "0")}</span></td>
                      <td title={ticket.titulo}>{ticket.titulo}</td>
                      <td><span className={`nexdesk-workspace-priority ${ticket.prioridad}`}>{ticket.prioridad || "Media"}</span></td>
                      <td><span className={`nexdesk-ticket-state ${ticket.estado}`}>{nombreEstado(ticket.estado)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="nexdesk-workspace-empty-state">
              <span className="nexdesk-workspace-empty-icon"><Icono nombre={cargando ? "clock" : "ticket"} tamano={30} /></span>
              <h3>{bandejaVacia.titulo}</h3>
              <p>{bandejaVacia.descripcion}</p>
              {bandejaVacia.accion && <Link to={bandejaVacia.accion.ruta}>{bandejaVacia.accion.texto} <span aria-hidden="true">→</span></Link>}
            </div>
          )}
        </article>

        <article className="nexdesk-workspace-panel nexdesk-workspace-activity-panel">
          <div className="nexdesk-workspace-panel-heading">
            <h2><Icono nombre="chart" tamano={15} />{esTecnico ? "Actividad de atención" : "Actividad de solicitudes"}</h2>
            <div className="nexdesk-workspace-chart-actions">
              <button type="button" onClick={onActualizar} disabled={cargando} aria-label="Actualizar datos" title="Actualizar datos">↻</button>
              <select value={periodoActividad} onChange={(evento) => setPeriodoActividad(evento.target.value)} aria-label="Periodo de actividad">
                <option value="7">Últimos 7 días</option>
                <option value="30">Últimos 30 días</option>
              </select>
            </div>
          </div>
          <ActividadTickets tickets={tickets} rango={periodoActividad} campoFecha={esTecnico ? "fecha_actualizacion" : "fecha_creacion"} />
          <div className="nexdesk-workspace-activity-caption">
            <span><i aria-hidden="true" />{tickets.length ? "Actividad actualizada con tus tickets visibles" : "Aún no hay actividad registrada"}</span>
            <small>{tickets.length ? "Selecciona otro periodo para revisar la tendencia." : "Las actualizaciones aparecerán aquí."}</small>
          </div>
        </article>

        <article className="nexdesk-workspace-panel nexdesk-workspace-actions-panel">
          <div className="nexdesk-workspace-panel-heading"><h2><Icono nombre="bolt" tamano={15} />Acciones rápidas</h2></div>
          <div className="nexdesk-workspace-actions">
            {acciones.map((accion) => (
              <Link key={accion.texto} to={accion.ruta} className={accion.principal ? "primary" : ""}>
                <Icono nombre={accion.icono} tamano={17} />
                <span>{accion.texto}</span>
              </Link>
            ))}
          </div>
          <div className={`nexdesk-workspace-actions-status ${pendientes ? "has-pending" : ""}`}>
            <span><Icono nombre={pendientes ? "clock" : "shield"} tamano={20} /></span>
            <div>
              <small>Estado de la jornada</small>
              <strong>{estadoJornada}</strong>
              <p>{pendientes ? "Prioriza los casos pendientes para mantener el servicio al día." : "No tienes casos pendientes en este momento."}</p>
            </div>
          </div>
        </article>
      </section>
      {mostrarBienvenida && <ToastBienvenida nombre={nombre} onCerrar={cerrarBienvenida} />}
    </div>
  );
}

export default function Dashboard() {
  const { usuario, token } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [recarga, setRecarga] = useState(0);
  const [mostrarBienvenida, setMostrarBienvenida] = useState(
    () => sessionStorage.getItem("nexdesk_mostrar_bienvenida") === "1"
  );
  const rol = usuario?.rol?.nombre || usuario?.rol;
  const esAdmin = ["admin", "superadmin"].includes(rol);

  useEffect(() => {
    if (!token) return undefined;
    const controlador = new AbortController();
    async function cargarTickets() {
      setCargando(true);
      try {
        const datos = await listarTickets(token, "todos", controlador.signal);
        if (!Array.isArray(datos)) throw new Error("El servidor no devolvió una lista de tickets.");
        if (!controlador.signal.aborted) {
          setTickets(datos);
          setError("");
        }
        if (esAdmin) {
          listarTecnicos(token, controlador.signal)
            .then((listaTecnicos) => {
              if (!controlador.signal.aborted && Array.isArray(listaTecnicos)) setTecnicos(listaTecnicos);
            })
            .catch(() => {
              if (!controlador.signal.aborted) setTecnicos([]);
            });
        } else {
          setTecnicos([]);
        }
      } catch (err) {
        if (!controlador.signal.aborted) setError(err instanceof Error ? err.message : "Error de consulta");
      } finally {
        if (!controlador.signal.aborted) setCargando(false);
      }
    }
    cargarTickets();
    return () => controlador.abort();
  }, [token, recarga, esAdmin]);

  const cerrarBienvenida = useCallback(() => {
    sessionStorage.removeItem("nexdesk_mostrar_bienvenida");
    setMostrarBienvenida(false);
  }, []);
  const actualizar = useCallback(() => setRecarga((valor) => valor + 1), []);
  if (esAdmin) {
    return <DashboardAdministrativo usuario={{ ...usuario, rol }} tickets={tickets} tecnicos={tecnicos} cargando={cargando} error={error} onActualizar={actualizar} mostrarBienvenida={mostrarBienvenida} cerrarBienvenida={cerrarBienvenida} />;
  }

  return <DashboardOperativo usuario={{ ...usuario, rol }} tickets={tickets} cargando={cargando} error={error} onActualizar={actualizar} mostrarBienvenida={mostrarBienvenida} cerrarBienvenida={cerrarBienvenida} />;
}
