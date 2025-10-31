import { useEffect, useState } from "react";
import { apiGet } from "../services/api";
import type { Ticket } from "../services/api";
import { Link } from "react-router-dom";
import { TicketCard } from "../components/TicketCard";

type TicketsResponse = { tickets: Ticket[] } | { message: string };

export default function HomePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <main className="page page--home">
      <header className="page__header">
        <h2 className="page__title">Tickets</h2>
        <nav className="page__actions" aria-label="Ações">
          <Link className="nav__link" to="/ticket/new">+ Novo Ticket</Link>
          <Link className="nav__link" to="/register">Registrar Usuário/Admin</Link>
        </nav>
      </header>
      {loading && <p>Carregando...</p>}
      {error && <p className="form__message form__message--error">{error}</p>}
      {message && <p>{message}</p>}
      {tickets.length > 0 && (
        <ul className="list" aria-live="polite">
          {tickets.map((t: Ticket, idx: number) => (
            <TicketCard key={t.id ?? idx} ticket={t} />
          ))}
        </ul>
      )}
    </main>
  );
}
