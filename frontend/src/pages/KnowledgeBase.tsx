import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import { apiGet } from "../services/api";
import PageHeader from "../components/PageHeader";
import PageLayout from "../components/PageLayout";
import DataTable, { type DataTableColumn } from "../components/DataTable";

interface Article {
  id: number;
  title: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

type SortField = "id" | "title" | "createdAt" | "updatedAt";
type SortOrder = "asc" | "desc" | "default";

export default function KnowledgeBase() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("default");
  const navigate = useNavigate();
  const { showError } = useToast();

  const loadArticles = async () => {
    setIsLoading(true);
    try {
      const data = await apiGet<Article[]>("/api/knowledgebase");
      setArticles(data);
    } catch (error: unknown) {
      console.error("Erro ao carregar artigos:", error);
      const err = error as { message?: string };
      // Não mostrar erro se for 401/403 (não autorizado) - apenas deixa vazio
      if (err?.message?.includes("401") || err?.message?.includes("403")) {
        setArticles([]);
      } else {
        showError("Erro ao carregar base de conhecimento");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadArticles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleSort = (field: string) => {
    const newField = field as SortField;

    if (sortField === newField) {
      // Ciclo: default -> asc -> desc -> default
      if (sortOrder === "default") {
        setSortOrder("asc");
      } else if (sortOrder === "asc") {
        setSortOrder("desc");
      } else {
        setSortOrder("default");
        setSortField(null);
      }
    } else {
      setSortField(newField);
      setSortOrder("asc");
    }
  };

  const sortedArticles = useMemo(() => {
    if (!sortField || sortOrder === "default") {
      return articles;
    }

    const sorted = [...articles].sort((a, b) => {
      let aVal: string | number = a[sortField];
      let bVal: string | number = b[sortField];

      // Converter datas para timestamp
      if (sortField === "createdAt" || sortField === "updatedAt") {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return sorted;
  }, [articles, sortField, sortOrder]);

  const columns: DataTableColumn<Article>[] = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      className: "data-table__cell--id",
      render: (article) => `#${article.id}`,
    },
    {
      key: "title",
      label: "Título",
      sortable: true,
      className: "data-table__cell--title",
    },
    {
      key: "createdByName",
      label: "Autor",
    },
    {
      key: "createdAt",
      label: "Criado em",
      sortable: true,
      className: "data-table__cell--date",
      render: (article) => formatDate(article.createdAt),
    },
    {
      key: "updatedAt",
      label: "Atualizado em",
      sortable: true,
      className: "data-table__cell--date",
      render: (article) => formatDate(article.updatedAt),
    },
  ];

  return (
    <PageLayout>
      <PageHeader breadcrumbs={[{ label: "Base de Conhecimento" }]} />

      <main className="home-page">
        <section className="home-page__filters">
          <div className="summary-card">
            <div className="summary-card__content">
              <div className="summary-card__indicator summary-card__indicator--purple" />
              <div className="summary-card__info">
                <p className="summary-card__label">Total de Artigos</p>
                <p className="summary-card__value">{articles.length}</p>
              </div>
            </div>
            {!isLoading && articles.length > 0 && (
              <div className="summary-card__action">
                <button
                  className="btn btn--primary"
                  onClick={() => navigate("/knowledgebase/create")}
                >
                  Criar Artigo
                </button>
              </div>
            )}
          </div>
        </section>

        {isLoading ? (
          <div className="loading">
            <div className="loading__spinner"></div>
            <p>Carregando artigos...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="empty-state">
            <svg
              className="empty-state__icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h2 className="empty-state__title">Nenhum artigo publicado</h2>
            <p className="empty-state__description">
              Crie o primeiro artigo para a base de conhecimento
            </p>
            <button className="btn btn--primary" onClick={() => navigate("/knowledgebase/create")}>
              Criar Primeiro Artigo
            </button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={sortedArticles}
            loading={false}
            emptyMessage="Nenhum artigo encontrado"
            onRowClick={(article) => navigate(`/knowledgebase/${article.id}`)}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={handleSort}
            getRowKey={(article) => article.id}
          />
        )}
      </main>
    </PageLayout>
  );
}
