import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import logoLJFT from "../assets/images/logoLJFT.png";

interface AppLayoutProps {
  children: ReactNode;
}

// Simple initials from a placeholder name
function UserBadge() {
  const initials = "LA";
  return <span className="user-badge__initials">{initials}</span>;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidenav" aria-label="Menu lateral">
        <div className="sidenav__brand">
          <img
            className="sidenav__brand-image"
            src={logoLJFT}
            alt="Logo LIFT"
          />
        </div>
        <nav className="sidenav__nav" aria-label="Navegação">
          <p className="sidenav__section">Menu</p>
          <div className="sidenav__group sidenav__group--open">
            <span className="sidenav__item">Assistência</span>
            <ul className="sidenav__submenu">
              <li
                className={`sidenav__submenu-item ${
                  isHome ? "sidenav__submenu-item--active" : ""
                }`}
              >
                <Link to="/">Chamados</Link>
              </li>
              <li className="sidenav__submenu-item">
                <Link to="/ticket/new">Criar chamados</Link>
              </li>
              <li className="sidenav__submenu-item">
                <a href="#">Estatísticas</a>
              </li>
              <li className="sidenav__submenu-item">
                <a href="#">Base de conhecimento</a>
              </li>
            </ul>
          </div>
          <p className="sidenav__section">Ferramentas</p>
          <div className="sidenav__item">
            <Link to="/register">Configurações</Link>
          </div>
        </nav>
        <button className="sidenav__toggle" type="button">
          {"<< Receber menu"}
        </button>
      </aside>

      {/* Main area */}
      <div className="layout__main">
        <header className="topbar">
          <div className="topbar__breadcrumb">
            Home / Assistência / <strong>Chamados</strong>
          </div>
          <div className="topbar__controls">
            <input
              className="topbar__search-input"
              type="search"
              placeholder="Pesquisar..."
              aria-label="Pesquisar"
            />
            <button className="topbar__search-button" aria-label="Buscar">
              🔍
            </button>
            <div className="user-badge">
              Técnico <UserBadge />
            </div>
          </div>
        </header>

        <main className="layout__content">{children}</main>
      </div>
    </div>
  );
}
