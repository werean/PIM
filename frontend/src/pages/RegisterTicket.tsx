import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { isAuthenticated } from "../utils/cookies";
import { isTechnician, apiPost } from "../services/api";
import PageHeader from "../components/PageHeader";
import PageLayout from "../components/PageLayout";
import FormField from "../components/FormField";
import { useToast } from "../hooks/useToast";

export default function RegisterTicketPage() {
  const [title, setTitle] = useState("");
  const [ticketBody, setTicketBody] = useState("");
  const [urgency, setUrgency] = useState("1");
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();

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

    // ✅ TÉCNICOS criam ticket direto (sem triagem)
    if (isTechnician()) {
      setIsCreating(true);
      try {
        console.log("Criando ticket como técnico...");
        await apiPost("/tickets", {
          title: title.trim(),
          ticketBody: ticketBody.trim(),
          urgency: parseInt(urgency, 10),
        });

        showSuccess("Chamado criado com sucesso!");
        navigate("/home");
      } catch (error) {
        console.error("Erro ao criar ticket:", error);
        showError("Erro ao criar chamado. Tente novamente.");
      } finally {
        setIsCreating(false);
      }
      return;
    }

    // ✅ USUÁRIOS vão para triagem com IA
    navigate("/ticket-triage", {
      state: {
        title: title.trim(),
        ticketBody: ticketBody.trim(),
        urgency: parseInt(urgency, 10),
      },
    });
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
          />

          <div className="form__actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => navigate("/home")}
              disabled={isCreating}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={isCreating}>
              {isTechnician() ? "Criar Ticket" : "Continuar"}
            </button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}
