import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import AnaliticaTickets from "../components/AnaliticaTickets";
import Icono from "../components/Icono";
import { useAuth } from "../hooks/useAuth";
import { listarTickets } from "../services/tickets.service";

export default function Reportes() {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    if (!token) return undefined;
    const controlador = new AbortController();

    async function cargarReportes() {
      setCargando(true);
      try {
        const datos = await listarTickets(token, "todos", controlador.signal);
        if (!Array.isArray(datos)) throw new Error("El servidor no devolvió una lista de tickets.");
        if (!controlador.signal.aborted) {
          setTickets(datos);
          setError("");
        }
      } catch (err) {
        if (!controlador.signal.aborted) {
          setError(err instanceof Error ? err.message : "No fue posible cargar los reportes.");
        }
      } finally {
        if (!controlador.signal.aborted) setCargando(false);
      }
    }

    cargarReportes();
    return () => controlador.abort();
  }, [token, recarga]);

  const actualizar = useCallback(() => setRecarga((valor) => valor + 1), []);
  const busqueda = (searchParams.get("buscar") || "").trim().toLowerCase();
  const ticketsFiltrados = useMemo(() => {
    if (!busqueda) return tickets;
    return tickets.filter((ticket) => [
      ticket.id,
      ticket.titulo,
      ticket.descripcion,
      ticket.estado,
      ticket.prioridad,
      ticket.categoria?.nombre,
    ].filter(Boolean).join(" ").toLowerCase().includes(busqueda));
  }, [busqueda, tickets]);

  return (
    <div className="nexdesk-reports-page">
      <section className="nexdesk-reports-hero">
        <div>
          <span><Icono nombre="chart" tamano={15} />Centro de reportes</span>
          <h1>Reportes y analítica</h1>
          <p>Consulta el estado del soporte y descarga los datos de tickets de VORTIX.</p>
        </div>
        <div className="nexdesk-reports-hero-icon"><Icono nombre="chart" tamano={47} /></div>
      </section>

      <section className="nexdesk-reports-info" aria-label="Opciones de reportes">
        <div><span><Icono nombre="ticket" tamano={17} /></span><p><strong>Datos actualizados</strong><small>Consulta los tickets visibles para tu cuenta.</small></p></div>
        <div><span><Icono nombre="chart" tamano={17} /></span><p><strong>Exportación disponible</strong><small>Descarga el reporte completo en CSV o PDF.</small></p></div>
        <div><span><Icono nombre="shield" tamano={17} /></span><p><strong>Información segura</strong><small>Solo se muestran los datos autorizados.</small></p></div>
      </section>

      <section className="nexdesk-reports-content">
        <AnaliticaTickets tickets={ticketsFiltrados} cargando={cargando} error={error} onActualizar={actualizar} />
      </section>
    </div>
  );
}
