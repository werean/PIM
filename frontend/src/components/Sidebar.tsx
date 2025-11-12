import { Link, useLocation } from "react-router-dom";
import logoLJFT from "../assets/images/logoLJFT.png";
import { getCurrentUserRole } from "../services/api";

/**
 * Sidebar navigation component
 * Usa HTML semântico (aside, nav) e metodologia BEM
 */
export default function Sidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === "/home") {
      return currentPath === "/" || currentPath === "/home";
    }
    if (path === "/trash") {
      return currentPath === "/trash";
    }
    if (path === "/ticket/new") {
      return currentPath === "/ticket/new";
    }
    return false;
  };

  return (
    <aside className="sidebar" aria-label="Menu lateral">
      <Link to="/home" className="sidebar__logo-link">
        <img className="sidebar__logo" src={logoLJFT} alt="Logo LJFT" />
      </Link>

      <nav className="sidebar__nav" aria-label="Navegação">
        <p className="sidebar__nav-title">Menu</p>

        <div className="sidebar__nav-items">
          <Link
            to="/home"
            className={`sidebar__nav-item ${
              isActive("/home") ? "sidebar__nav-item--active" : ""
            }`}
          >
            Chamados
          </Link>

          <Link
            to="/ticket/new"
            className={`sidebar__nav-item ${
              isActive("/ticket/new") ? "sidebar__nav-item--active" : ""
            }`}
          >
            Criar chamado
          </Link>

          {getCurrentUserRole() === "10" && (
            <Link
              to="/trash"
              className={`sidebar__nav-item ${
                isActive("/trash") ? "sidebar__nav-item--active" : ""
              }`}
            >
              Lixeira
            </Link>
          )}
        </div>
      </nav>
    </aside>
  );
}
