import { useEffect, useState } from "react";
import { consultarEstadoBackend } from "../services/estado.service";

export default function EstadoBackend({ variante = "predeterminada" }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  async function verificarConexion() {
    setCargando(true);
    setError("");
    try {
      setDatos(await consultarEstadoBackend());
    } catch (err) {
      setDatos(null);
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    let activo = true;
    consultarEstadoBackend()
      .then((resultado) => { if (activo) setDatos(resultado); })
      .catch((err) => { if (activo) setError(err.message); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, []);

  if (variante === "login") {
    const estado = error ? "error" : cargando ? "cargando" : "conectada";
    const textoEstado = error ? "Sin conexión" : cargando ? "Verificando" : "Conectada";

    return (
      <section className="nexdesk-login-backend" aria-label="Estado de la API REST">
        <div className="nexdesk-login-backend-status">
          <span className={`nexdesk-login-backend-dot ${estado}`} />
          <div>
            <strong>API REST</strong>
            <small>{error ? "Servidor no disponible." : cargando ? "Comprobando servidor..." : "Servidor accesible."}</small>
          </div>
          <span className={`nexdesk-login-backend-badge ${estado}`}>{textoEstado}</span>
        </div>
        {error && <p className="nexdesk-login-backend-error" role="alert">{error}</p>}
        <button type="button" onClick={verificarConexion} disabled={cargando}>
          <span aria-hidden="true">⌁</span> Verificar conexión
        </button>
      </section>
    );
  }

  return (
    <section className="mt-4" aria-label="Diagnóstico del backend">
      <div className="d-flex align-items-center justify-content-between gap-2">
        <span className="small text-secondary">API REST</span>
        <span className={`badge ${error ? "text-bg-danger" : cargando ? "text-bg-secondary" : "text-bg-success"}`}>
          {error ? "Sin conexión" : cargando ? "Verificando" : "Conectada"}
        </span>
      </div>
      {error && <p className="small text-danger mt-2 mb-0" role="alert">{error}</p>}
      {datos && !error && <p className="small text-secondary mt-2 mb-0">Servidor accesible.</p>}
      <button type="button" className="btn btn-link btn-sm p-0 mt-2" onClick={verificarConexion} disabled={cargando}>
        Verificar conexión
      </button>
    </section>
  );
}
