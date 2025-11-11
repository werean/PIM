import { Link, useLocation } from "react-router-dom";
import { getCurrentUserRole } from "../services/api";
import logoLJFT from "../assets/images/logoLJFT.png";

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
    <aside
      style={{
        width: "240px",
        background: "#2d2440",
        borderRight: "1px solid #3d3450",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 100,
      }}
      aria-label="Menu lateral"
    >
      <Link
        to="/home"
        style={{
          padding: "24px 20px",
          borderBottom: "1px solid #3d3450",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textDecoration: "none",
          cursor: "pointer",
          transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "0.8";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "1";
        }}
      >
        <img
          style={{
            height: "48px",
            objectFit: "contain",
          }}
          src={logoLJFT}
          alt="Logo LJFT"
        />
      </Link>

      <nav
        style={{
          padding: "16px 0",
          flex: 1,
        }}
        aria-label="Navegação"
      >
        <p
          style={{
            padding: "8px 20px",
            margin: 0,
            fontSize: "10px",
            fontWeight: 600,
            color: "#8b7ea8",
            textTransform: "uppercase",
            letterSpacing: "0.8px",
          }}
        >
          Menu
        </p>

        <div style={{ marginTop: "8px" }}>
          <Link
            to="/home"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 20px",
              fontSize: "14px",
              color: isActive("/home") ? "#ffffff" : "#b4a5d0",
              textDecoration: "none",
              background: isActive("/home") ? "#6c5ce7" : "transparent",
              borderLeft: isActive("/home") ? "3px solid #a29bfe" : "3px solid transparent",
              transition: "all 0.2s",
              fontWeight: isActive("/home") ? "500" : "400",
            }}
            onMouseEnter={(e) => {
              if (!isActive("/home")) {
                e.currentTarget.style.background = "#3d3450";
                e.currentTarget.style.color = "#ffffff";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive("/home")) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#b4a5d0";
              }
            }}
          >
            Chamados
          </Link>

          <Link
            to="/ticket/new"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 20px",
              fontSize: "14px",
              color: isActive("/ticket/new") ? "#ffffff" : "#b4a5d0",
              textDecoration: "none",
              background: isActive("/ticket/new") ? "#6c5ce7" : "transparent",
              borderLeft: isActive("/ticket/new") ? "3px solid #a29bfe" : "3px solid transparent",
              transition: "all 0.2s",
              fontWeight: isActive("/ticket/new") ? "500" : "400",
            }}
            onMouseEnter={(e) => {
              if (!isActive("/ticket/new")) {
                e.currentTarget.style.background = "#3d3450";
                e.currentTarget.style.color = "#ffffff";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive("/ticket/new")) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#b4a5d0";
              }
            }}
          >
            Criar chamado
          </Link>

          {getCurrentUserRole() === "10" && (
            <Link
              to="/trash"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 20px",
                fontSize: "14px",
                color: isActive("/trash") ? "#ffffff" : "#b4a5d0",
                textDecoration: "none",
                background: isActive("/trash") ? "#6c5ce7" : "transparent",
                borderLeft: isActive("/trash") ? "3px solid #a29bfe" : "3px solid transparent",
                transition: "all 0.2s",
                fontWeight: isActive("/trash") ? "500" : "400",
              }}
              onMouseEnter={(e) => {
                if (!isActive("/trash")) {
                  e.currentTarget.style.background = "#3d3450";
                  e.currentTarget.style.color = "#ffffff";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive("/trash")) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#b4a5d0";
                }
              }}
            >
              Lixeira
            </Link>
          )}
        </div>
      </nav>
    </aside>
  );
}
