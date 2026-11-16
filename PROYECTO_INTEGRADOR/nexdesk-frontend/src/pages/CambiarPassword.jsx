import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Icono from "../components/Icono";
import { useAuth } from "../hooks/useAuth";

function CampoPassword({ id, etiqueta, valor, onChange, autoComplete, descripcion, mostrar, onAlternar }) {
  return (
    <div className="nexdesk-password-field">
      <label htmlFor={id}><Icono nombre="lock" tamano={14} />{etiqueta}</label>
      {descripcion && <small>{descripcion}</small>}
      <div className="nexdesk-password-input">
        <input
          id={id}
          type={mostrar ? "text" : "password"}
          autoComplete={autoComplete}
          value={valor}
          onChange={onChange}
          minLength={id === "nueva" ? 12 : undefined}
          maxLength={id === "nueva" ? 128 : undefined}
          required
        />
        <button type="button" onClick={onAlternar} aria-label={mostrar ? `Ocultar ${etiqueta.toLowerCase()}` : `Mostrar ${etiqueta.toLowerCase()}`}>
          <Icono nombre={mostrar ? "eyeOff" : "eye"} tamano={17} />
        </button>
      </div>
    </div>
  );
}

export default function CambiarPassword() {
  const { usuario, cambiarPassword, logout } = useAuth();
  const navigate = useNavigate();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [mostrar, setMostrar] = useState({ actual: false, nueva: false, confirmacion: false });
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const obligatorio = Boolean(usuario?.debeCambiarPassword || usuario?.debe_cambiar_password);

  function alternar(campo) {
    setMostrar((anterior) => ({ ...anterior, [campo]: !anterior[campo] }));
  }

  async function enviar(evento) {
    evento.preventDefault();
    setError("");

    if (nueva.length < 12 || nueva.length > 128) {
      setError("La contraseña debe tener entre 12 y 128 caracteres.");
      return;
    }
    if (nueva !== confirmacion) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }
    if (actual === nueva) {
      setError("La contraseña nueva debe ser diferente a la actual.");
      return;
    }

    setCargando(true);
    try {
      await cambiarPassword(actual, nueva);
      logout();
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cambiar la contraseña.");
    } finally {
      setCargando(false);
    }
  }

  function cerrarSesion() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="nexdesk-password-page">
      <div className="nexdesk-password-orbit nexdesk-password-orbit-one" />
      <div className="nexdesk-password-orbit nexdesk-password-orbit-two" />

      <main className="nexdesk-password-shell">
        <aside className="nexdesk-password-showcase">
          <div className="nexdesk-password-logo"><span>V</span><strong>VORTIX</strong></div>
          <div className="nexdesk-password-shield"><Icono nombre="shield" tamano={72} /></div>
          <span className="nexdesk-password-section-label">SEGURIDAD DE LA CUENTA</span>
          <h1>Actualiza tu<br />contraseña</h1>
          <p>Una contraseña segura protege el acceso a tu información y a las solicitudes que gestionas.</p>
          <ul>
            <li><Icono nombre="shield" tamano={15} />Protección de tus datos</li>
            <li><Icono nombre="lock" tamano={15} />Acceso cifrado y seguro</li>
            <li><Icono nombre="users" tamano={15} />Sesión personal y controlada</li>
          </ul>
        </aside>

        <section className="nexdesk-password-form-side" aria-labelledby="titulo-cambio-password">
          <div className="nexdesk-password-form-content">
            <div className="nexdesk-password-form-top">
              <div>
                <span className="nexdesk-password-form-icon"><Icono nombre="lock" tamano={21} /></span>
                <h2 id="titulo-cambio-password">Cambiar contraseña</h2>
                <p>Actualiza las credenciales de tu cuenta VORTIX.</p>
              </div>
              {!obligatorio && <Link to="/dashboard" className="nexdesk-password-back" aria-label="Volver al panel"><Icono nombre="dashboard" tamano={16} /></Link>}
            </div>

            <div className="nexdesk-password-account"><span>{usuario?.nombre?.charAt(0)?.toUpperCase() || "U"}</span><div><small>CUENTA ACTIVA</small><strong>{usuario?.email || "Usuario autenticado"}</strong></div></div>

            {obligatorio && <div className="nexdesk-password-notice"><Icono nombre="shield" tamano={16} /><span>Debes actualizar tu contraseña antes de continuar.</span></div>}
            {error && <div className="nexdesk-password-error" role="alert">{error}</div>}

            <form className="nexdesk-password-form" onSubmit={enviar}>
              <CampoPassword id="actual" etiqueta="Contraseña actual" valor={actual} onChange={(evento) => setActual(evento.target.value)} autoComplete="current-password" mostrar={mostrar.actual} onAlternar={() => alternar("actual")} />
              <CampoPassword id="nueva" etiqueta="Nueva contraseña" descripcion="Usa entre 12 y 128 caracteres." valor={nueva} onChange={(evento) => setNueva(evento.target.value)} autoComplete="new-password" mostrar={mostrar.nueva} onAlternar={() => alternar("nueva")} />
              <CampoPassword id="confirmacion" etiqueta="Confirmar nueva contraseña" valor={confirmacion} onChange={(evento) => setConfirmacion(evento.target.value)} autoComplete="new-password" mostrar={mostrar.confirmacion} onAlternar={() => alternar("confirmacion")} />

              <button type="submit" className="nexdesk-password-submit" disabled={cargando}>
                <Icono nombre="shield" tamano={17} />{cargando ? "Actualizando contraseña..." : "Actualizar contraseña"}
              </button>
            </form>

            <button className="nexdesk-password-logout" type="button" onClick={cerrarSesion}>Cerrar sesión</button>
          </div>
        </section>
      </main>
    </div>
  );
}
