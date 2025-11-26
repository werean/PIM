import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import { apiPost } from "../services/api";
import PageHeader from "../components/PageHeader";
import PageLayout from "../components/PageLayout";
import FormField from "../components/FormField";
import Spinner from "../components/Spinner";

export default function CreateArticle() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [improvedArticle, setImprovedArticle] = useState({ title: "", content: "" });
  const [isSavingImproved, setIsSavingImproved] = useState(false);
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

  const handleImproveWithAI = async () => {
    if (!title.trim() || !body.trim()) {
      showError("Preencha título e conteúdo antes de melhorar com IA");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await apiPost<{ title: string; content: string }>(
        "/api/knowledgebase/improve-text",
        {
          title: title.trim(),
          content: body.trim(),
        }
      );

      setImprovedArticle({
        title: response.title,
        content: response.content,
      });
      setShowAIModal(true);
    } catch (error) {
      console.error("Erro ao melhorar texto com IA:", error);
      showError("Erro ao melhorar texto com IA. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveImproved = async () => {
    if (!improvedArticle.title.trim() || !improvedArticle.content.trim()) {
      showError("Título e conteúdo são obrigatórios.");
      return;
    }

    setIsSavingImproved(true);
    try {
      await apiPost("/api/knowledgebase", {
        title: improvedArticle.title.trim(),
        body: improvedArticle.content.trim(),
      });

      showSuccess("Artigo criado com sucesso!");
      navigate("/knowledgebase");
    } catch (error) {
      console.error("Erro ao salvar artigo:", error);
      showError("Erro ao salvar artigo. Tente novamente.");
    } finally {
      setIsSavingImproved(false);
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
              className="btn btn--cancel"
              onClick={() => navigate("/knowledgebase")}
              disabled={isSubmitting || isGenerating}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--info"
              onClick={handleImproveWithAI}
              disabled={isSubmitting || isGenerating || !title.trim() || !body.trim()}
              style={{
                backgroundColor: "#17a2b8",
                borderColor: "#17a2b8",
                color: "white",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {isGenerating ? (
                <>
                  <Spinner size={16} color="white" />
                  Gerando...
                </>
              ) : (
                "🤖 Melhorar texto com IA"
              )}
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={isSubmitting || isGenerating}
            >
              {isSubmitting ? "Salvando..." : "Salvar Artigo"}
            </button>
          </div>
        </form>
      </div>

      {/* Modal de texto melhorado pela IA */}
      {showAIModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => {
            if (!isSavingImproved) {
              setShowAIModal(false);
              setImprovedArticle({ title: "", content: "" });
            }
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "8px",
              padding: "24px",
              width: "90%",
              maxWidth: "700px",
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                margin: "0 0 20px 0",
                fontSize: "20px",
                fontWeight: "600",
                color: "#212529",
              }}
            >
              🤖 Texto Aprimorado pela IA
            </h2>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: "500",
                  fontSize: "14px",
                  color: "#495057",
                }}
              >
                Título *
              </label>
              <input
                type="text"
                value={improvedArticle.title}
                onChange={(e) => setImprovedArticle({ ...improvedArticle, title: e.target.value })}
                disabled={isSavingImproved}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ced4da",
                  borderRadius: "4px",
                  fontSize: "14px",
                  fontFamily: "inherit",
                }}
                placeholder="Título do artigo"
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: "500",
                  fontSize: "14px",
                  color: "#495057",
                }}
              >
                Conteúdo *
              </label>
              <textarea
                value={improvedArticle.content}
                onChange={(e) =>
                  setImprovedArticle({ ...improvedArticle, content: e.target.value })
                }
                disabled={isSavingImproved}
                rows={12}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ced4da",
                  borderRadius: "4px",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
                placeholder="Conteúdo do artigo"
              />
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  if (!isSavingImproved) {
                    setShowAIModal(false);
                    setImprovedArticle({ title: "", content: "" });
                  }
                }}
                disabled={isSavingImproved}
                style={{
                  padding: "10px 20px",
                  background: "transparent",
                  color: "#dc3545",
                  border: "1px solid #dc3545",
                  borderRadius: "6px",
                  cursor: isSavingImproved ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  opacity: isSavingImproved ? 0.6 : 1,
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!isSavingImproved) e.currentTarget.style.backgroundColor = "#fce8ea";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveImproved}
                disabled={
                  isSavingImproved ||
                  !improvedArticle.title.trim() ||
                  !improvedArticle.content.trim()
                }
                style={{
                  padding: "10px 20px",
                  background: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor:
                    isSavingImproved ||
                    !improvedArticle.title.trim() ||
                    !improvedArticle.content.trim()
                      ? "not-allowed"
                      : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  opacity:
                    isSavingImproved ||
                    !improvedArticle.title.trim() ||
                    !improvedArticle.content.trim()
                      ? 0.6
                      : 1,
                }}
              >
                {isSavingImproved ? "Salvando..." : "Salvar e Criar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
