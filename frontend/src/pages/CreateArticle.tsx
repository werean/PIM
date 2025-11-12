import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import { apiPost } from "../services/api";
import PageHeader from "../components/PageHeader";
import PageLayout from "../components/PageLayout";
import FormField from "../components/FormField";

export default function CreateArticle() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showError("Título é obrigatório");
      return;
    }

    if (!body.trim()) {
      showError("Corpo do artigo é obrigatório");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiPost("/api/knowledgebase", {
        title: title.trim(),
        body: body.trim(),
      });

      showSuccess("Artigo criado com sucesso!");
      navigate("/knowledgebase");
    } catch (error) {
      console.error("Erro ao criar artigo:", error);
      showError("Erro ao criar artigo");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout>
      <PageHeader
        breadcrumbs={[
          { label: "Base de Conhecimento", path: "/knowledgebase" },
          { label: "Novo Artigo" },
        ]}
      />

      <div className="form-container">
        <form className="form" onSubmit={handleSubmit}>
          <FormField
            id="title"
            label="Título do Artigo"
            required
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Digite o título do artigo..."
            maxLength={200}
            disabled={isSubmitting}
            error={title.trim() === "" && isSubmitting ? "Título é obrigatório" : undefined}
          />

          <FormField
            id="body"
            label="Conteúdo do Artigo"
            required
            as="textarea"
            rows={15}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Digite o conteúdo do artigo..."
            disabled={isSubmitting}
            style={{ minHeight: "300px", resize: "vertical" }}
            error={body.trim() === "" && isSubmitting ? "Conteúdo é obrigatório" : undefined}
          />

          <div className="form__actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => navigate("/knowledgebase")}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar Artigo"}
            </button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}
