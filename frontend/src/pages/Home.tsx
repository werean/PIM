import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

// API Request
import type { Ticket } from "../services/api";
import { apiGet } from "../services/api";

// Utils
import { isAuthenticated } from "../utils/cookies";

// Hooks
import { useToast } from "../hooks/useToast";

// Components
import FilterCard from "../components/FilterCard";
import PageHeader from "../components/PageHeader";
import PageLayout from "../components/PageLayout";
import TicketsTable from "../components/TicketsTable";

// Tipagem
type TicketsResponse = Ticket[] | { message: string };
type StatusKind =
  | "Aberto"
  | "Pendente"
  | "Resolvido"
  | "Reaberto"
  | "Aguardando Aprovação"
  | "Aguardando Exclusão"
  | "Deletado";

const STATUS_MAP: Record<number, StatusKind> = {
  1: "Aberto",
  2: "Pendente",
  3: "Resolvido",
  4: "Reaberto",
  5: "Aguardando Aprovação",
  6: "Aguardando Exclusão",
  7: "Deletado",
};

function deriveStatus(t: Ticket): StatusKind {
  return STATUS_MAP[t.status] || "Aberto";
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "-";

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";

    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yy = String(date.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  } catch {
    return "-";
  }
}

type SortField = "id" | "status" | "date" | "urgency";
type SortOrder = "asc" | "desc" | "default";

/**
 * Página principal com lista de chamados
 * Refatorada com componentes reutilizáveis, HTML semântico e BEM
 */
export default function HomePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<
    StatusKind | "Total" | null
  >(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("default");
  const navigate = useNavigate();
  const { showError } = useToast();

  // Proteção de rota: redireciona para login se não estiver autenticado
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await apiGet<TicketsResponse>("/tickets");
        if (!mounted) return;
        if (Array.isArray(data)) {
          setTickets(data);
          setMessage(null);
        } else {
          setMessage(data.message);
        }
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Erro ao carregar tickets";
        if (mounted) {
          showError(msg);
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
  }, [showError]);

  const derived = useMemo(
    () =>
      tickets.map((t) => ({
        ...t,
        _status: deriveStatus(t),
        _date: formatDate(t.createdAt),
      })),
    [tickets]
  );

  const statusCounts = useMemo(() => {
    const base: Record<StatusKind, number> = {
      Aberto: 0,
      Pendente: 0,
      Resolvido: 0,
      Reaberto: 0,
      "Aguardando Aprovação": 0,
      "Aguardando Exclusão": 0,
      Deletado: 0,
    };
    derived.forEach((t) => {
      base[t._status]++;
    });
    return base;
  }, [derived]);

  const filtered = useMemo(
    () =>
      derived.filter((t) => {
        const catOK =
          categoryFilter && categoryFilter !== "Total"
            ? t._status === categoryFilter
            : true;
        return catOK;
      }),
    [derived, categoryFilter]
  );

  const sorted = useMemo(() => {
    if (!sortField || sortOrder === "default") return filtered;

    const copy = [...filtered];

    if (sortField === "id") {
      copy.sort((a, b) => {
        const aId = a.id || 0;
        const bId = b.id || 0;
        return sortOrder === "asc" ? aId - bId : bId - aId;
      });
    } else if (sortField === "status") {
      const statusPriority: Record<string, number> = {
        Aberto: sortOrder === "asc" ? 1 : sortOrder === "desc" ? 2 : 3,
        Pendente: sortOrder === "asc" ? 2 : sortOrder === "desc" ? 1 : 3,
        Resolvido: sortOrder === "asc" ? 3 : sortOrder === "desc" ? 3 : 1,
        Reaberto: sortOrder === "asc" ? 4 : sortOrder === "desc" ? 4 : 4,
      };
      copy.sort((a, b) => {
        const aPriority = statusPriority[a._status] || 999;
        const bPriority = statusPriority[b._status] || 999;
        return aPriority - bPriority;
      });
    } else if (sortField === "date") {
      copy.sort((a, b) => {
        const aDate = new Date(a.createdAt || 0).getTime();
        const bDate = new Date(b.createdAt || 0).getTime();
        return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
      });
    } else if (sortField === "urgency") {
      const urgencyPriority: Record<number, number> = {
        3: sortOrder === "asc" ? 1 : sortOrder === "desc" ? 2 : 3,
        2: sortOrder === "asc" ? 2 : sortOrder === "desc" ? 1 : 3,
        1: sortOrder === "asc" ? 3 : sortOrder === "desc" ? 3 : 1,
      };
      copy.sort((a, b) => {
        const aPriority = urgencyPriority[a.urgency || 1] || 999;
        const bPriority = urgencyPriority[b.urgency || 1] || 999;
        return aPriority - bPriority;
      });
    }

    return copy;
  }, [filtered, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> default -> asc
      if (sortOrder === "asc") setSortOrder("desc");
      else if (sortOrder === "desc") setSortOrder("default");
      else setSortOrder("asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const toggleFilter = (filter: StatusKind) => {
    setCategoryFilter(categoryFilter === filter ? null : filter);
  };

  return (
    <PageLayout>
      <PageHeader
        breadcrumbs={[{ label: "Home", path: "/home" }, { label: "Chamados" }]}
      />

      <main className="home-page">
        <section className="home-page__filters">
          <FilterCard
            label="Abertos"
            count={statusCounts.Aberto}
            isActive={categoryFilter === "Aberto"}
            onClick={() => toggleFilter("Aberto")}
            variant="open"
          />
          <FilterCard
            label="Pendentes"
            count={statusCounts.Pendente}
            isActive={categoryFilter === "Pendente"}
            onClick={() => toggleFilter("Pendente")}
            variant="pending"
          />
          <FilterCard
            label="Resolvidos"
            count={statusCounts.Resolvido}
            isActive={categoryFilter === "Resolvido"}
            onClick={() => toggleFilter("Resolvido")}
            variant="resolved"
          />
          <FilterCard
            label="Total"
            count={derived.length}
            isActive={categoryFilter === null}
            onClick={() => setCategoryFilter(null)}
            variant="total"
          />
        </section>

        <section className="home-page__table">
          <TicketsTable
            tickets={sorted}
            loading={loading}
            message={message}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={handleSort}
          />
        </section>
      </main>
    </PageLayout>
  );
}
