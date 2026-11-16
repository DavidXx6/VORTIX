import { useState } from "react";
import { useNavigate } from "react-router-dom";

import EstadoBackend from "../components/EstadoBackend";
import Icono from "../components/Icono";
import { useAuth } from "../hooks/useAuth";

function IlustracionSoporte() {
  return (
    <svg className="nexdesk-login-artwork" viewBox="0 0 360 260" role="img" aria-label="Portátil y herramientas de soporte técnico">
      <defs>
        <linearGradient id="loginScreen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#164aab" />
          <stop offset=".6" stopColor="#152762" />
          <stop offset="1" stopColor="#0d1639" />
        </linearGradient>
        <linearGradient id="loginKeyboard" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9fd3ff" />
          <stop offset=".46" stopColor="#508bff" />
          <stop offset="1" stopColor="#3838c4" />
        </linearGradient>
        <linearGradient id="loginMark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4ad1ff" />
          <stop offset="1" stopColor="#5140f8" />
        </linearGradient>
        <filter id="loginBlur"><feGaussianBlur stdDeviation="10" /></filter>
      </defs>
      <ellipse cx="183" cy="201" rx="134" ry="33" fill="#173ef8" opacity=".44" filter="url(#loginBlur)" />
      <ellipse cx="182" cy="197" rx="140" ry="36" fill="none" stroke="#16d7ff" strokeWidth="2.5" opacity=".86" transform="rotate(-7 182 197)" />
      <ellipse cx="181" cy="197" rx="116" ry="25" fill="none" stroke="#7441ff" strokeWidth="2" opacity=".9" transform="rotate(12 181 197)" />

      <path d="M133 47 260 82a10 10 0 0 1 7 12l-22 85-131-38 22-84a10 10 0 0 1 7-10Z" fill="#090f2d" stroke="#8cb6ff" strokeWidth="3" />
      <path d="m139 55 118 34-19 75-118-34 19-75Z" fill="url(#loginScreen)" />
      <path d="m158 70 79 23-3 12-79-23 3-12Z" fill="#2359bb" opacity=".52" />
      <path d="m153 91 73 21-3 8-73-21 3-8Z" fill="#8ec4ff" opacity=".18" />
      <rect x="174" y="99" width="49" height="49" rx="13" fill="url(#loginMark)" transform="rotate(16 198 123)" />
      <text x="198" y="134" textAnchor="middle" fill="white" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="34" transform="rotate(16 198 123)">V</text>

      <path d="m112 142 133 39 54 26a8 8 0 0 1-3 15l-158-7-96-43a8 8 0 0 1 2-15l68-15Z" fill="url(#loginKeyboard)" stroke="#bbd8ff" strokeWidth="2" />
      <path d="m122 150 98 29-24 21-112-32 38-18Z" fill="#234aab" opacity=".94" />
      <path d="m139 158 69 20M128 164l69 20M117 170l69 20" stroke="#8ab8ff" strokeWidth="2" opacity=".5" />
      <path d="m172 184 28 8-14 10-29-8 15-10Z" fill="#c5dbff" opacity=".95" />

      <path d="M76 107c-22 0-39 17-39 39v27h17v-26c0-12 10-22 22-22s22 10 22 22v26h17v-27c0-22-17-39-39-39Z" fill="#2c74ed" />
      <path d="M43 143h22v34H43a9 9 0 0 1-9-9v-16a9 9 0 0 1 9-9Zm65 0h-22v34h22a9 9 0 0 0 9-9v-16a9 9 0 0 0-9-9Z" fill="#6240ff" />
      <path d="M48 147h12v25H48Zm43 0h12v25H91Z" fill="#3e9dff" />

      <path d="M284 158c12 0 22 12 22 26v41h-44v-41c0-14 10-26 22-26Z" fill="#2559e9" />
      <path d="M262 182h44l-6 36h-32l-6-36Z" fill="#1b3eaf" />
      <path d="M283 158c-3-18 4-29 17-33-3 15-8 24-17 33Z" fill="#2de0d6" />
      <path d="M285 166c-12-14-18-26-10-39 10 12 13 25 10 39Z" fill="#1bb9e8" />
      <path d="M285 180v-41" stroke="#8ff8f5" strokeWidth="2" opacity=".7" />
      <path d="M293 204h14" stroke="#83caff" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function manejarLogin(evento) {
    evento.preventDefault();
    setError("");
    setCargando(true);
    sessionStorage.removeItem("nexdesk_mostrar_bienvenida");

    try {
      const perfil = await login(email, password);
      if (perfil.debeCambiarPassword || perfil.debe_cambiar_password) {
        navigate("/cambiar-password", { replace: true });
      } else {
        sessionStorage.setItem("nexdesk_mostrar_bienvenida", "1");
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible iniciar sesión.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="nexdesk-login-page">
      <div className="nexdesk-login-orbit nexdesk-login-orbit-one" />
      <div className="nexdesk-login-orbit nexdesk-login-orbit-two" />

      <main className="nexdesk-login-shell">
        <aside className="nexdesk-login-showcase" aria-label="Información sobre VORTIX">
          <div className="nexdesk-login-showcase-brand">
            <strong>VORTIX</strong>
            <span>Sistema Integral de Gestión<br />de Soporte Técnico</span>
          </div>

          <IlustracionSoporte />

          <div className="nexdesk-login-features">
            <div><span><Icono nombre="bolt" tamano={20} /></span><p><strong>Gestión de tickets</strong><small>Crea, asigna y da seguimiento.</small></p></div>
            <div><span><Icono nombre="users" tamano={20} /></span><p><strong>Control de usuarios</strong><small>Administra roles y permisos.</small></p></div>
            <div><span><Icono nombre="chart" tamano={20} /></span><p><strong>Reportes y análisis</strong><small>Visualiza el rendimiento del sistema.</small></p></div>
          </div>
        </aside>

        <section className="nexdesk-login-form-side" aria-labelledby="titulo-login">
          <div className="nexdesk-login-form-content">
            <div className="nexdesk-login-brand-mark">V</div>
            <h1 id="titulo-login">VOR<span>TIX</span></h1>
            <p className="nexdesk-login-subtitle">Sistema Integral de Gestión de Soporte Técnico</p>
            <h2>¡Bienvenido de nuevo! <span aria-hidden="true">👋</span></h2>
            <p className="nexdesk-login-instruction">Inicia sesión para continuar</p>

            {error && <div className="nexdesk-login-error" role="alert">{error}</div>}

            <form className="nexdesk-login-form" onSubmit={manejarLogin}>
              <label htmlFor="email"><Icono nombre="mail" tamano={14} /> Correo electrónico</label>
              <div className="nexdesk-login-input">
                <input id="email" type="email" value={email} onChange={(evento) => setEmail(evento.target.value)} autoComplete="username" placeholder="Ingresa tu correo electrónico" required />
              </div>

              <label htmlFor="password"><Icono nombre="lock" tamano={14} /> Contraseña</label>
              <div className="nexdesk-login-input">
                <input id="password" type={mostrarPassword ? "text" : "password"} value={password} onChange={(evento) => setPassword(evento.target.value)} autoComplete="current-password" placeholder="Ingresa tu contraseña" required />
                <button type="button" onClick={() => setMostrarPassword((valor) => !valor)} aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"} title={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                  <Icono nombre={mostrarPassword ? "eyeOff" : "eye"} tamano={17} />
                </button>
              </div>

              <button className="nexdesk-login-submit" type="submit" disabled={cargando}>
                <Icono nombre="login" tamano={18} />
                {cargando ? "Validando acceso..." : "Iniciar sesión"}
              </button>
            </form>

            <EstadoBackend variante="login" />

            <p className="nexdesk-login-security"><Icono nombre="shield" tamano={14} /> Acceso autorizado a VORTIX</p>
          </div>
        </section>
      </main>
    </div>
  );
}
