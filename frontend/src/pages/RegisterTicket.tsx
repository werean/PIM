import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import logoLJFT from "../assets/images/logoLJFT.png";
import { apiPost } from "../services/api";
import { isAuthenticated } from "../utils/cookies";
import { ErrorMessage, FieldError } from "../components/ErrorMessage";

export default function RegisterTicketPage() {
  const [title, setTitle] = useState("");
  const [ticketBody, setTicketBody] = useState("");
  const [urgency, setUrgency] = useState("1"); // 1 = Low, 2 = Medium, 3 = High
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    ticketBody?: string;
  }>({});
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  // Proteção de rota: redireciona para login se não estiver autenticado
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
    }
  }, [navigate]);

  // Validação do formulário
  const validateForm = (): boolean => {
    const newFieldErrors: {
      title?: string;
      ticketBody?: string;
    } = {};
    let isValid = true;

    // Validar título
    if (!title.trim()) {
      newFieldErrors.title = "Título é obrigatório";
      isValid = false;
    } else if (title.length < 5) {
      newFieldErrors.title = "Título deve ter no mínimo 5 caracteres";
      isValid = false;
    } else if (title.length > 200) {
      newFieldErrors.title = "Título deve ter no máximo 200 caracteres";
      isValid = false;
    }

    // Validar descrição
    if (!ticketBody.trim()) {
      newFieldErrors.ticketBody = "Descrição é obrigatória";
      isValid = false;
    } else if (ticketBody.length < 10) {
      newFieldErrors.ticketBody = "Descrição deve ter no mínimo 10 caracteres";
      isValid = false;
    }

    setFieldErrors(newFieldErrors);
    return isValid;
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setErrors([]);
    setFieldErrors({});

    // Validação do formulário
    if (!validateForm()) {
      return;
    }

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
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; errors?: string[] } }; message?: string };
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
      setError(
        error.response?.data?.message ||
          error.message ||
          "Erro ao criar chamado"
      );
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

          {(error || errors.length > 0) && (
            <ErrorMessage message={error || undefined} errors={errors} />
          )}

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
              onChange={(e) => {
                setTitle(e.target.value);
                if (fieldErrors.title) {
                  setFieldErrors({ ...fieldErrors, title: undefined });
                }
              }}
              required
              maxLength={200}
            />
            <FieldError error={fieldErrors.title} />
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
              onChange={(e) => {
                setTicketBody(e.target.value);
                if (fieldErrors.ticketBody) {
                  setFieldErrors({ ...fieldErrors, ticketBody: undefined });
                }
              }}
              required
              rows={5}
              style={{ resize: "vertical", fontFamily: "inherit" }}
            />
            <FieldError error={fieldErrors.ticketBody} />
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
