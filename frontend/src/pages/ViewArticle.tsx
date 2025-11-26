import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import { apiGet, apiPut } from "../services/api";
import PageHeader from "../components/PageHeader";
import PageLayout from "../components/PageLayout";
import FormField from "../components/FormField";

interface ArticleData {
  id: number;
  title: string;
  body: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export default function ViewArticle() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const loadArticle = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const data = await apiGet<ArticleData>(`/api/knowledgebase/${id}`);
      setArticle(data);
      setTitle(data.title);
      setBody(data.body);
    } catch (error) {
      console.error("Erro ao carregar artigo:", error);
      showError("Erro ao carregar artigo");
      navigate("/knowledgebase");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadArticle();
  }, [id]);

  const handleSave = async () => {
    if (!id) return;

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
      await apiPut(`/api/knowledgebase/${id}`, {
        title: title.trim(),
        body: body.trim(),
      });

      showSuccess("Artigo atualizado com sucesso!");
      setIsEditing(false);
      await loadArticle();
    } catch (error) {
      console.error("Erro ao atualizar artigo:", error);
      showError("Erro ao atualizar artigo");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    if (article) {
      setTitle(article.title);
      setBody(article.body);
    }
    setIsEditing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="loading">
          <div className="loading__spinner"></div>
          <p>Carregando artigo...</p>
        </div>
      </PageLayout>
    );
  }

  if (!article) {
    return null;
  }

  return (
    <PageLayout>
      <PageHeader
        breadcrumbs={[
          { label: "Base de Conhecimento", path: "/knowledgebase" },
          { label: `#${article.id} - ${article.title}` },
        ]}
      />

      <div className="article-view">
        <div className="article-view__header">
          <div className="article-view__meta">
            <span className="article-view__author">Por: {article.createdByName}</span>
            <span className="article-view__date">Criado: {formatDate(article.createdAt)}</span>
            {article.updatedAt !== article.createdAt && (
              <span className="article-view__date">
                Atualizado: {formatDate(article.updatedAt)}
              </span>
            )}
          </div>

          <div className="article-view__actions">
            {!isEditing ? (
              <button className="btn btn--primary" onClick={() => setIsEditing(true)}>
                Editar
              </button>
            ) : (
              <>
                <button
                  className="btn btn--cancel"
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button className="btn btn--primary" onClick={handleSave} disabled={isSubmitting}>
                  {isSubmitting ? "Salvando..." : "Salvar"}
                </button>
              </>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="form-container">
            <form
              className="form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
            >
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
              />

              <FormField
                id="body"
                label="Conteúdo do Artigo"
                required
                as="textarea"
                rows={15}
                disabled={isSubmitting}
                style={{ minHeight: "300px", resize: "vertical" }}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Digite o conteúdo do artigo..."
              />
            </form>
          </div>
        ) : (
          <div className="article-view__content">
            <h1 className="article-view__title">{article.title}</h1>
            <div className="article-view__body">
              {article.body.split("\n").map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
