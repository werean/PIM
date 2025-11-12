import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../services/api";
import { isAuthenticated } from "../utils/cookies";
import PageHeader from "../components/PageHeader";
import PageLayout from "../components/PageLayout";
import FormField from "../components/FormField";
import { useToast } from "../hooks/useToast";

export default function RegisterTicketPage() {
  const [title, setTitle] = useState("");
  const [ticketBody, setTicketBody] = useState("");
  const [urgency, setUrgency] = useState("1");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
    }
  }, [navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showError("Título é obrigatório");
      return;
    }

    if (title.length < 5) {
      showError("Título deve ter no mínimo 5 caracteres");
      return;
    }

    if (!ticketBody.trim()) {
      showError("Descrição é obrigatória");
      return;
    }

    setLoading(true);

    try {
      await apiPost("/tickets", {
        title: title.trim(),
        ticketBody: ticketBody.trim(),
        urgency: parseInt(urgency, 10),
      });

      showSuccess("Chamado criado com sucesso!");
      navigate("/home");
    } catch (err: unknown) {
      console.error("Erro ao criar chamado:", err);
      const error = err as { response?: { data?: { message?: string } } };
      showError(error?.response?.data?.message || "Erro ao criar chamado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <PageHeader breadcrumbs={[{ label: "Chamados", path: "/home" }, { label: "Novo Chamado" }]} />

      <div className="form-container">
        <form className="form" onSubmit={handleSubmit}>
          <FormField
            id="title"
            label="Título do chamado"
            required
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Problema com impressora"
            maxLength={200}
            disabled={loading}
          />

          <FormField
            id="ticketBody"
            label="Descrição do problema"
            required
            as="textarea"
            rows={5}
            value={ticketBody}
            onChange={(e) => setTicketBody(e.target.value)}
            placeholder="Descreva o problema em detalhes..."
            disabled={loading}
            style={{ minHeight: "150px", resize: "vertical" }}
          />

          <FormField
            id="urgency"
            label="Urgência"
            required
            as="select"
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
            options={[
              { value: "1", label: "Baixa" },
              { value: "2", label: "Média" },
              { value: "3", label: "Alta" },
            ]}
            disabled={loading}
          />

          <div className="form__actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => navigate("/home")}
              disabled={loading}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? "Criando..." : "Criar Chamado"}
            </button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}
