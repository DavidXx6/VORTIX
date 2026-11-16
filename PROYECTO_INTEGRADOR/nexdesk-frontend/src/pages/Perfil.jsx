import { useRef, useState } from "react";
import { Link } from "react-router-dom";

import Icono from "../components/Icono";
import { useAuth } from "../hooks/useAuth";

const tiposDocumento = ["CC", "TI", "CE", "PA", "PPT", "OTRO"];

function datosDeUsuario(usuario) {
  return {
    tipoDocumento: usuario?.tipoDocumento || "",
    numeroDocumento: usuario?.numeroDocumento || "",
    nombre: usuario?.nombre || "",
    apellido: usuario?.apellido || "",
  };
}

export default function Perfil() {
  const {
    usuario,
    actualizarPerfil,
    actualizarFotoPerfil,
    eliminarFotoPerfil,
  } = useAuth();
  const inputFoto = useRef(null);
  const [datos, setDatos] = useState(() => datosDeUsuario(usuario));
  const [guardando, setGuardando] = useState(false);
  const [fotoOcupada, setFotoOcupada] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [mensajeFoto, setMensajeFoto] = useState("");
  const inicial = usuario?.nombre?.charAt(0)?.toUpperCase() || "U";
  const nombreCompleto = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(" ");
  const rol = usuario?.rol?.nombre || usuario?.rol || "Usuario";
  const etiquetaRol = rol === "superadmin" ? "Superadministrador" : rol === "admin" ? "Administrador" : rol === "tecnico" ? "Técnico" : "Usuario";

  function cambiarCampo(evento) {
    const { name, value } = evento.target;
    setDatos((actuales) => ({ ...actuales, [name]: value }));
    setError("");
    setMensaje("");
  }

  function descartarCambios() {
    setDatos(datosDeUsuario(usuario));
    setError("");
    setMensaje("");
  }

  async function guardar(evento) {
    evento.preventDefault();
    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      const respuesta = await actualizarPerfil({
        tipo_documento: datos.tipoDocumento,
        numero_documento: datos.numeroDocumento,
        nombre: datos.nombre,
        apellido: datos.apellido,
      });
      setDatos(datosDeUsuario(respuesta?.usuario || usuario));
      setMensaje(respuesta?.mensaje || "Perfil actualizado correctamente.");
    } catch (err) {
      setError(err.message || "No se pudo actualizar el perfil.");
    } finally {
      setGuardando(false);
    }
  }

  async function seleccionarFoto(evento) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo) return;

    setMensajeFoto("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) {
      setMensajeFoto("Elige una imagen JPG, PNG o WEBP.");
      return;
    }
    if (archivo.size > 2 * 1024 * 1024) {
      setMensajeFoto("La imagen debe pesar máximo 2 MB.");
      return;
    }

    setFotoOcupada(true);
    try {
      await actualizarFotoPerfil(archivo);
      setMensajeFoto("Foto actualizada.");
    } catch (err) {
      setMensajeFoto(err.message || "No se pudo actualizar la foto.");
    } finally {
      setFotoOcupada(false);
    }
  }

  async function quitarFoto() {
    setFotoOcupada(true);
    setMensajeFoto("");
    try {
      await eliminarFotoPerfil();
      setMensajeFoto("Foto eliminada. Ahora se muestra tu inicial.");
    } catch (err) {
      setMensajeFoto(err.message || "No se pudo eliminar la foto.");
    } finally {
      setFotoOcupada(false);
    }
  }

  return (
    <section className="nexdesk-perfil-page">
      <header className="nexdesk-perfil-heading">
        <div>
          <span className="nexdesk-perfil-eyebrow">CUENTA PERSONAL</span>
          <h1>Mi perfil</h1>
          <p>Administra tus datos y la forma en que apareces en NEXDESK.</p>
        </div>
        <Link className="nexdesk-perfil-password-link" to="/cambiar-password">
          <Icono nombre="lock" tamano={15} />
          <span>Cambiar contraseña</span>
        </Link>
      </header>

      <div className="nexdesk-perfil-layout">
        <aside className="card nexdesk-perfil-summary">
          <div className="nexdesk-perfil-summary-cover" aria-hidden="true" />
          <div className="card-body nexdesk-perfil-summary-body">
            <span className="nexdesk-perfil-active"><i /> Cuenta activa</span>
            {usuario?.fotoPerfilUrl ? (
              <img
                className="nexdesk-avatar nexdesk-avatar-image nexdesk-perfil-avatar mx-auto"
                src={usuario.fotoPerfilUrl}
                alt={`Foto de perfil de ${nombreCompleto || "usuario"}`}
              />
            ) : (
              <span className="nexdesk-avatar nexdesk-perfil-avatar mx-auto">{inicial}</span>
            )}
            <h2>{nombreCompleto || "Usuario"}</h2>
            <span className="nexdesk-perfil-role">{etiquetaRol}</span>

            <div className="nexdesk-perfil-facts">
              <div>
                <span className="nexdesk-perfil-fact-icon"><Icono nombre="mail" tamano={15} /></span>
                <span><small>Correo electrónico</small><strong>{usuario?.email || "Sin correo"}</strong></span>
              </div>
              <div>
                <span className="nexdesk-perfil-fact-icon"><Icono nombre="users" tamano={15} /></span>
                <span><small>Documento</small><strong>{[usuario?.tipoDocumento, usuario?.numeroDocumento].filter(Boolean).join(" · ") || "Sin documento"}</strong></span>
              </div>
            </div>

            <div className="nexdesk-perfil-photo-tools">
              <button type="button" className="nexdesk-perfil-photo-change" onClick={() => inputFoto.current?.click()} disabled={fotoOcupada}>
                <Icono nombre="camera" tamano={15} />
                <span>{fotoOcupada ? "Guardando..." : usuario?.fotoPerfilUrl ? "Cambiar foto" : "Agregar foto"}</span>
              </button>
              {usuario?.fotoPerfilUrl && (
                <button type="button" className="nexdesk-perfil-photo-remove" onClick={quitarFoto} disabled={fotoOcupada} aria-label="Eliminar foto de perfil">
                  <Icono nombre="trash" tamano={15} />
                </button>
              )}
              <input
                ref={inputFoto}
                className="d-none"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Seleccionar foto de perfil"
                onChange={seleccionarFoto}
              />
            </div>
            <small className="nexdesk-perfil-photo-hint">JPG, PNG o WEBP · máximo 2 MB</small>
            {mensajeFoto && <p className="nexdesk-perfil-photo-message" role="status">{mensajeFoto}</p>}
          </div>
        </aside>

        <form className="card nexdesk-perfil-form-card" onSubmit={guardar}>
          <div className="card-header nexdesk-perfil-form-header">
            <span className="nexdesk-perfil-form-icon"><Icono nombre="users" tamano={18} /></span>
            <div>
              <h2>Información personal</h2>
              <p>Corrige tus datos y guarda los cambios en tu perfil.</p>
            </div>
            <span className="nexdesk-perfil-editable-tag">Editable</span>
          </div>

          <div className="card-body nexdesk-perfil-form-body">
            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            {mensaje && <div className="alert alert-success" role="status">{mensaje}</div>}

            <div className="nexdesk-perfil-fields-heading">
              <span>DATOS PERSONALES</span>
              <small>Completa los campos para guardar los cambios</small>
            </div>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label" htmlFor="perfil-nombre">Nombre <span className="nexdesk-perfil-required">*</span></label>
                <input
                  id="perfil-nombre"
                  className="form-control"
                  name="nombre"
                  value={datos.nombre}
                  onChange={cambiarCampo}
                  maxLength={100}
                  autoComplete="given-name"
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="perfil-apellido">Apellido <span className="nexdesk-perfil-required">*</span></label>
                <input
                  id="perfil-apellido"
                  className="form-control"
                  name="apellido"
                  value={datos.apellido}
                  onChange={cambiarCampo}
                  maxLength={100}
                  autoComplete="family-name"
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="perfil-tipo-documento">Tipo de documento <span className="nexdesk-perfil-required">*</span></label>
                <select
                  id="perfil-tipo-documento"
                  className="form-select"
                  name="tipoDocumento"
                  value={datos.tipoDocumento}
                  onChange={cambiarCampo}
                  required
                >
                  <option value="" disabled>Selecciona una opción</option>
                  {tiposDocumento.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="perfil-numero-documento">Número de documento <span className="nexdesk-perfil-required">*</span></label>
                <input
                  id="perfil-numero-documento"
                  className="form-control"
                  name="numeroDocumento"
                  value={datos.numeroDocumento}
                  onChange={cambiarCampo}
                  minLength={4}
                  maxLength={30}
                  pattern="[A-Za-z0-9-]{4,30}"
                  autoComplete="off"
                  required
                />
                <div className="nexdesk-perfil-field-hint">4 a 30 letras, números o guiones.</div>
              </div>
            </div>

            <div className="nexdesk-perfil-access-heading">
              <div>
                <span>DATOS DE ACCESO</span>
                <small>Estos datos los administra el equipo de soporte.</small>
              </div>
              <Icono nombre="lock" tamano={16} />
            </div>
            <div className="nexdesk-perfil-readonly-field">
              <label className="form-label" htmlFor="perfil-correo">Correo electrónico</label>
              <div className="input-group nexdesk-perfil-access-group">
                <span className="nexdesk-perfil-access-icon"><Icono nombre="mail" tamano={16} /></span>
                <input id="perfil-correo" className="form-control" value={usuario?.email || ""} readOnly />
                <span className="nexdesk-perfil-readonly-mark">Solo lectura</span>
              </div>
            </div>
          </div>

          <div className="card-footer nexdesk-perfil-form-footer">
            <span><Icono nombre="shield" tamano={15} /> Los cambios se aplican únicamente a tu cuenta.</span>
            <div>
              <button type="button" className="btn btn-outline-secondary" onClick={descartarCambios} disabled={guardando}>
                Descartar
              </button>
              <button type="submit" className="btn btn-primary" disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
