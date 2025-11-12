import { useNavigate } from "react-router-dom";
import { getCurrentUserName } from "../services/api";
import { deleteCookie } from "../utils/cookies";
import UserBadge from "./UserBadge";

interface PageHeaderProps {
  breadcrumbs: Array<{ label: string; path?: string }>;
  className?: string;
}

/**
 * Header semântico com breadcrumb navigation e user info
 * Segue padrão BEM para nomenclatura de classes
 */
export default function PageHeader({
  breadcrumbs,
  className = "",
}: PageHeaderProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    deleteCookie("token");
    deleteCookie("user");
    navigate("/login");
  };

  return (
    <header className={`page-header ${className}`}>
      <nav className="page-header__breadcrumb" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, index) => (
          <span key={index} className="page-header__breadcrumb-item">
            {index > 0 && (
              <span className="page-header__breadcrumb-separator"> / </span>
            )}
            {crumb.path ? (
              <button
                onClick={() => navigate(crumb.path!)}
                className="page-header__breadcrumb-link"
                type="button"
              >
                {crumb.label}
              </button>
            ) : (
              <strong className="page-header__breadcrumb-current">
                {crumb.label}
              </strong>
            )}
          </span>
        ))}
      </nav>

      <div className="page-header__user-section">
        <button
          onClick={() => navigate("/profile")}
          className="page-header__user-button"
          type="button"
          aria-label="Ver perfil"
        >
          <UserBadge size={28} fontSize={11} />
          <span className="page-header__user-name">{getCurrentUserName()}</span>
        </button>

        <button
          onClick={handleLogout}
          className="page-header__logout-button"
          type="button"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
