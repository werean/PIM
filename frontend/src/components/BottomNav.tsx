import { Link, useLocation } from "react-router-dom";
import { isTechnician } from "../services/api";
import "../css/BottomNav.css";

/**
 * Bottom navigation bar for mobile devices
 * Displayed only on screens <= 768px
 */
export default function BottomNav() {
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
    if (path === "/knowledgebase") {
      return currentPath.startsWith("/knowledgebase");
    }
    return false;
  };

  return (
    <nav className="bottom-nav" aria-label="Navegação inferior">
      <Link
        to="/home"
        className={`bottom-nav__item ${isActive("/home") ? "bottom-nav__item--active" : ""}`}
      >
        <svg
          className="bottom-nav__icon"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <span className="bottom-nav__label">Chamados</span>
      </Link>

      <Link
        to="/ticket/new"
        className={`bottom-nav__item ${isActive("/ticket/new") ? "bottom-nav__item--active" : ""}`}
      >
        <svg
          className="bottom-nav__icon"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="bottom-nav__label">Criar</span>
      </Link>

      {isTechnician() && (
        <>
          <Link
            to="/knowledgebase"
            className={`bottom-nav__item ${
              isActive("/knowledgebase") ? "bottom-nav__item--active" : ""
            }`}
          >
            <svg
              className="bottom-nav__icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <span className="bottom-nav__label">Base</span>
          </Link>

          <Link
            to="/trash"
            className={`bottom-nav__item ${isActive("/trash") ? "bottom-nav__item--active" : ""}`}
          >
            <svg
              className="bottom-nav__icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            <span className="bottom-nav__label">Lixeira</span>
          </Link>
        </>
      )}
    </nav>
  );
}
