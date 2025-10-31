import { Link } from "react-router-dom";

export default function AppHeader() {
  return (
    <header className="app-header" role="banner">
      <div className="app-header__inner">
        <div className="brand">Ticket AI</div>
        <nav className="nav" aria-label="Principal">
          <Link className="nav__link" to="/">
            Home
          </Link>
          <Link className="nav__link" to="/ticket/new">
            Novo Ticket
          </Link>
          <Link className="nav__link" to="/register">
            Registrar Usuário/Admin
          </Link>
          <Link className="nav__link" to="/login">
            Login
          </Link>
        </nav>
      </div>
    </header>
  );
}
