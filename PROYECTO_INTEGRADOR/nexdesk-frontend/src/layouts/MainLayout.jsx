
import { useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import NavbarPrincipal from "../components/NavbarPrincipal";
import { useAuth } from "../hooks/useAuth";

export default function MainLayout() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { usuario } = useAuth();
  const rol = usuario?.rol?.nombre || usuario?.rol;
  const esAdmin = ["superadmin", "admin"].includes(rol);
  const esOperativo = ["tecnico", "usuario"].includes(rol);

  return (
    <div className={`nexdesk-app ${esAdmin ? "nexdesk-admin-theme" : ""} ${esOperativo ? "nexdesk-workspace-theme" : ""}`}>
      <Sidebar
        abierto={menuAbierto}
        cerrar={() => setMenuAbierto(false)}
      />

      <div className="nexdesk-main">
        <NavbarPrincipal
          abrirMenu={() => setMenuAbierto(true)}
        />

        <main className="nexdesk-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
