
import { useEffect, useState } from "react";
import Icono from "./Icono";

export default function ToastBienvenida({ nombre, onCerrar }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const inicio = setTimeout(() => setVisible(true), 50);
    const cierre = setTimeout(() => setVisible(false), 3800);
    const finalizar = setTimeout(() => onCerrar(), 4300);

    return () => {
      clearTimeout(inicio);
      clearTimeout(cierre);
      clearTimeout(finalizar);
    };
  }, [onCerrar]);

  return (
    <div
      className={`nexdesk-toast ${visible ? "visible" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="nexdesk-toast-content">
        <div className="nexdesk-toast-icon">
          <Icono nombre="shield" tamano={21} />
        </div>

        <div className="nexdesk-toast-copy">
          <strong>¡Bienvenido/a, {nombre}!</strong>
          <span>Has iniciado sesión correctamente en VORTIX.</span>
        </div>

        <button
          type="button"
          className="nexdesk-toast-close"
          aria-label="Cerrar notificación"
          onClick={onCerrar}
        >
          ×
        </button>
      </div>

      <div className="nexdesk-toast-progress" />
    </div>
  );
}
