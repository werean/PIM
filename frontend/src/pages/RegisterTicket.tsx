import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import logoLJFT from "../assets/images/logoLJFT.png";
import { apiPost } from "../services/api";
import { isAuthenticated } from "../utils/cookies";

export default function RegisterTicketPage() {
  const [title, setTitle] = useState("");
  const [ticketBody, setTicketBody] = useState("");
  const [urgency, setUrgency] = useState("1"); // 1 = Low, 2 = Medium, 3 = High
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  // Proteção de rota: redireciona para login se não estiver autenticado
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
    }
  }, [navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiPost("/tickets", {
        title,
        ticketBody,
        urgency: Number(urgency),
      });

      setSuccess(true);
      
      // Redireciona para home após 2 segundos
      setTimeout(() => {
        navigate("/home");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar chamado");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="login-page">
        <div className="login-page__card">
          <img src={logoLJFT} alt="Logo LIFT" className="login-page__logo" />
          <div className="login-form">
            <h2 className="login-form__title">✅ Chamado criado com sucesso!</h2>
            <p style={{ textAlign: "center", marginTop: "20px" }}>
              Redirecionando para a lista de chamados...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-page__card">
        <img src={logoLJFT} alt="Logo LIFT" className="login-page__logo" />
        <form onSubmit={handleSubmit} className="login-form">
          <h2 className="login-form__title">Criar novo chamado</h2>

          <div className="login-form__group">
            <label htmlFor="title" className="login-form__label">
              Título do chamado *
            </label>
            <input
              id="title"
              type="text"
              className="login-form__input"
              placeholder="Ex: Problema com impressora"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
            />
          </div>

          <div className="login-form__group">
            <label htmlFor="ticketBody" className="login-form__label">
              Descrição do problema *
            </label>
            <textarea
              id="ticketBody"
              className="login-form__input"
              placeholder="Descreva o problema em detalhes..."
              value={ticketBody}
              onChange={(e) => setTicketBody(e.target.value)}
              required
              rows={5}
              style={{ resize: "vertical", fontFamily: "inherit" }}
            />
          </div>

          <div className="login-form__group">
            <label htmlFor="urgency" className="login-form__label">
              Urgência *
            </label>
            <select
              id="urgency"
              className="login-form__input"
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              required
            >
              <option value="1">Baixa</option>
              <option value="2">Média</option>
              <option value="3">Alta</option>
            </select>
          </div>

          {error && <p className="login-form__error">{error}</p>}

          <button type="submit" className="login-form__submit" disabled={loading}>
            {loading ? "Criando..." : "Criar chamado"}
          </button>

          <p className="login-form__footer">
            <Link to="/home" className="login-form__link">
              ← Voltar para lista de chamados
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
