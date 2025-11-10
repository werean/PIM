import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// API Request
import type { Ticket } from "../services/api";
import { apiGet, getCurrentUserName, getCurrentUserRole } from "../services/api";

// Utils
import { isAuthenticated, deleteCookie } from "../utils/cookies";

// Imagens
import logoLJFT from "../assets/images/logoLJFT.png";

// Tipagem
type TicketsResponse = Ticket[] | { message: string };
type StatusKind = "Aberto" | "Pendente" | "Resolvido";

const STATUS_COLOR: Record<StatusKind, string> = {
  Aberto: "#2ab849",
  Pendente: "#f2a400",
  Resolvido: "#7e7e7e",
};

const STATUS_MAP: Record<number, StatusKind> = {
  1: "Aberto",
  2: "Pendente",
  3: "Resolvido",
};

function deriveStatus(t: Ticket): StatusKind {
  return STATUS_MAP[t.status] || "Aberto";
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function UserBadge() {
  const userName = getCurrentUserName();
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
  return <span className="user-badge__initials">{initials}</span>;
}

export default function HomePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"" | StatusKind>("");
  const [dateFilter, setDateFilter] = useState<string>("");
  const navigate = useNavigate();

  // Proteção de rota: redireciona para login se não estiver autenticado
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await apiGet<TicketsResponse>("/tickets");
        if (!mounted) return;
        if (Array.isArray(data)) {
          setTickets(data);
          setMessage(null);
        } else {
          setMessage(data.message);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao carregar tickets";
        if (mounted) {
          setError(msg);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const derived = useMemo(
    () =>
      tickets.map((t) => ({
        ...t,
        _status: deriveStatus(t),
        _date: formatDate(t.created_at),
      })),
    [tickets]
  );

  const statusCounts = useMemo(() => {
    const base: Record<StatusKind, number> = {
      Aberto: 0,
      Pendente: 0,
      Resolvido: 0,
    };
    derived.forEach((t) => {
      base[t._status]++;
    });
    return base;
  }, [derived]);

  const filtered = useMemo(
    () =>
      derived.filter((t) => {
        const stOK = statusFilter ? t._status === statusFilter : true;
        const dtOK = dateFilter ? t._date === dateFilter : true;
        return stOK && dtOK;
      }),
    [derived, statusFilter, dateFilter]
  );

  return (
    <div className="layout">
      <aside className="sidenav" aria-label="Menu lateral">
        <div className="sidenav__brand">
          <img className="sidenav__brand-image" src={logoLJFT} alt="Logo LJFT" />
          <button className="sidenav__toggle" type="button">
            {"<< Recolher menu"}
          </button>
        </div>
        <nav className="sidenav__nav" aria-label="Navegação">
          <p className="sidenav__section">Menu</p>
          <div className="sidenav__submenu">
            <Link to="/home" className="sidenav__submenu-item sidenav__submenu-item--active">
              Chamados
            </Link>
            <Link to="/ticket/new" className="sidenav__submenu-item">
              Criar chamados
            </Link>
          </div>
        </nav>
      </aside>

      <div className="layout__main">
        <header className="topbar">
          <div className="topbar__breadcrumb">
            Home / <strong>Chamados</strong>
          </div>

          <div className="topbar__controls" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="user-badge">
              {getCurrentUserRole()} <UserBadge />
            </div>
            <button
              onClick={() => {
                deleteCookie("token");
                deleteCookie("user");
                navigate("/login");
              }}
              style={{
                background: "#dc3545",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              Sair
            </button>
          </div>
        </header>

        <main className="layout__content">
          <section className="chamados">
            <div className="status-cards">
              <div className="status-cards__item status-cards__item--green">
                {statusCounts.Aberto} Chamados abertos
              </div>
              <div className="status-cards__item status-cards__item--orange">
                {statusCounts.Pendente} Chamados pendentes
              </div>
              <div className="status-cards__item status-cards__item--gray">
                {statusCounts.Resolvido} Chamados resolvidos
              </div>
              <div className="status-cards__item status-cards__item--blue">
                {filtered.length} Total de chamados
              </div>
            </div>

            <div className="data-table" role="table" aria-label="Tabela de Chamados">
              <table className="data-table__table" cellSpacing={0}>
                <thead className="data-table__head">
                  <tr>
                    <th>ID</th>
                    <th>TÍTULO</th>
                    <th>STATUS</th>
                    <th>DATA DE ABERTURA</th>
                    <th>URGÊNCIA</th>
                  </tr>
                </thead>
                <tbody className="data-table__body">
                  {loading && (
                    <tr>
                      <td colSpan={5}>Carregando...</td>
                    </tr>
                  )}
                  {error && (
                    <tr>
                      <td colSpan={5} className="form__message form__message--error">
                        {error}
                      </td>
                    </tr>
                  )}
                  {message && !loading && !error && (
                    <tr>
                      <td colSpan={5}>{message}</td>
                    </tr>
                  )}
                  {!loading &&
                    !error &&
                    filtered.map((t, idx) => (
                      <tr key={t.id ?? idx}>
                        <td>{t.id ?? "-"}</td>
                        <td className="data-table__status">
                          <span
                            className="data-table__status-dot"
                            style={{ backgroundColor: STATUS_COLOR[t._status] }}
                            title={t._status}
                          />
                          <span className="data-table__status-text">{t._status}</span>
                        </td>
                        <td className="data-table__title">{t.title}</td>
                        <td>{t._date}</td>
                        <td>-</td>
                      </tr>
                    ))}
                  {!loading && !error && filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "20px" }}>
                        Nenhum chamado encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
