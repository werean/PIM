import { useState, type ChangeEvent, type FormEvent } from "react";
import { apiPost } from "../services/api";
import type { CreateTicketPayload } from "../services/api";

export default function RegisterTicketPage() {
  const [form, setForm] = useState<CreateTicketPayload>({
    title: "",
    ticket_body: "",
    urgency: 1,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target as HTMLInputElement & HTMLTextAreaElement & HTMLSelectElement;
    setForm((prev: CreateTicketPayload) => ({
      ...prev,
      [name]: name === "urgency" ? (Number(value) as 1 | 2 | 3) : value,
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await apiPost<{ message?: string }>("/ticket", form);
      setMessage(res.message ?? "Ticket criado com sucesso.");
      setForm({ title: "", ticket_body: "", urgency: 1 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao criar ticket";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page page--ticket-new">
      <h2 className="page__title">Novo Ticket</h2>
      <form onSubmit={handleSubmit} className="form" aria-label="Formulário de Ticket">
        <div className="form__group">
          <label className="form__label" htmlFor="ticket-title">Título</label>
          <input
            id="ticket-title"
            className="form__input"
            name="title"
            type="text"
            value={form.title}
            onChange={handleChange}
            placeholder="Ex.: Erro ao acessar o sistema"
            required
          />
        </div>
        <div className="form__group">
          <label className="form__label" htmlFor="ticket-body">Descrição</label>
          <textarea
            id="ticket-body"
            className="form__textarea"
            name="ticket_body"
            value={form.ticket_body}
            onChange={handleChange}
            placeholder="Explique o problema com detalhes"
            rows={5}
            required
          />
        </div>
        <div className="form__group">
          <label className="form__label" htmlFor="ticket-urgency">Urgência</label>
          <select id="ticket-urgency" className="form__select" name="urgency" value={form.urgency} onChange={handleChange}>
            <option value={1}>1 - Baixa</option>
            <option value={2}>2 - Média</option>
            <option value={3}>3 - Alta</option>
          </select>
        </div>
        <div className="form__actions">
          <button type="submit" disabled={loading}>
            {loading ? "Enviando..." : "Criar Ticket"}
          </button>
        </div>
      </form>
      {message && <p className="form__message form__message--success">{message}</p>}
      {error && <p className="form__message form__message--error">{error}</p>}
    </main>
  );
}
