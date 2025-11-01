import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import logoLJFT from "../assets/images/logoLJFT.png";
import type { Ticket } from "../services/api";
import { apiGet } from "../services/api";

type TicketsResponse = { tickets: Ticket[] } | { message: string };
type StatusKind = "Novo" | "Pendente" | "Atrasado" | "Concluido";

const STATUS_COLOR: Record<StatusKind, string> = {
  Novo: "#2ab849",
  Pendente: "#f2a400",
  Atrasado: "#d63333",
  Concluido: "#7e7e7e",
};

function deriveStatus(t: Ticket): StatusKind {
  const s = (t.status || "").toLowerCase();
  if (s.includes("conclu")) return "Concluido";
  if (s.includes("atras")) return "Atrasado";
  if (s.includes("penden")) return "Pendente";
  if (s.includes("novo")) return "Novo";
  if (t.urgency === 3) return "Atrasado";
  if (t.urgency === 2) return "Pendente";
  return "Novo";
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
  const initials = "LA";
  return <span className="user-badge__initials">{initials}</span>;
}

export default function HomePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"" | StatusKind>("");
  const [dateFilter, setDateFilter] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await apiGet<TicketsResponse>("/ticket");
        if (!mounted) return;
        if ("tickets" in data) {
          setTickets(data.tickets);
          setMessage(null);
        } else {
          setMessage(data.message);
        }
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Erro ao carregar tickets";
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
    const base = { Novo: 0, Pendente: 0, Atrasado: 0, Concluido: 0 } as Record<
      StatusKind,
      number
    >;
    derived.forEach((t) => {
      base[t._status]++;
    });
    return base;
  }, [derived]);

  const uniqueDates = useMemo(
    () =>
      Array.from(new Set(derived.map((t) => t._date))).filter(
        (d) => d && d !== "-"
      ),
    [derived]
  );

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
              <li className="sidenav__submenu-item sidenav__submenu-item--active">
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

        <main className="layout__content">
          <section className="chamados">
            <div className="status-cards">
              <div className="status-cards__item status-cards__item--green">
                {statusCounts.Novo} Chamados novos
              </div>
              <div className="status-cards__item status-cards__item--orange">
                {statusCounts.Pendente} Chamados pendentes
              </div>
              <div className="status-cards__item status-cards__item--red">
                {statusCounts.Atrasado} Chamados atrasados
              </div>
              <div className="status-cards__item status-cards__item--gray">
                {statusCounts.Concluido} Chamados solucionados
              </div>
            </div>

            <div className="filters" role="region" aria-label="Filtros">
              <div className="filters__field">
                <label className="filters__label">Status do chamado</label>
                <select
                  className="filters__select"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as StatusKind | "")
                  }
                >
                  <option value="">Selecionar...</option>
                  <option value="Novo">Novo</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Atrasado">Atrasado</option>
                  <option value="Concluido">Concluido</option>
                </select>
              </div>
              <div className="filters__field">
                <label className="filters__label">Data de abertura</label>
                <select
                  className="filters__select"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                >
                  <option value="">Selecionar...</option>
                  {uniqueDates.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <button className="filters__submit" onClick={() => {}}>
                Buscar <span className="filters__loader" />
              </button>
            </div>

            <div
              className="data-table"
              role="table"
              aria-label="Tabela de Chamados"
            >
              <table className="data-table__table" cellSpacing={0}>
                <thead className="data-table__head">
                  <tr>
                    <th>ID</th>
                    <th>STATUS</th>
                    <th>TÍTULO</th>
                    <th>DATA DE ABERTURA</th>
                    <th>REQUERENTE</th>
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
                      <td
                        colSpan={5}
                        className="form__message form__message--error"
                      >
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
                          <span className="data-table__status-text">
                            {t._status}
                          </span>
                        </td>
                        <td className="data-table__title">{t.title}</td>
                        <td>{t._date}</td>
                        <td>-</td>
                      </tr>
                    ))}
                  {!loading && !error && filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        style={{ textAlign: "center", padding: "20px" }}
                      >
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
