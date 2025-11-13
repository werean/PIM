import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ConfirmModal from "../components/ConfirmModal";
import PageLayout from "../components/PageLayout";
import PageHeader from "../components/PageHeader";
import DataTable, { type DataTableColumn } from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import UrgencyBadge from "../components/UrgencyBadge";
import { useConfirm } from "../hooks/useConfirm";
import { useToast } from "../hooks/useToast";
import type { Ticket } from "../services/api";
import { apiGet, isTechnician } from "../services/api";
import { isAuthenticated } from "../utils/cookies";

type TicketsResponse = Ticket[] | { message: string };
type SortField = "id" | "createdAt" | "deletedAt";
type SortOrder = "asc" | "desc" | "default";

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

export default function TrashPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("default");
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { confirm, confirmState, handleCancel } = useConfirm();

  // Proteção de rota: apenas técnicos
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }
    if (!isTechnician()) {
      navigate("/home");
      return;
    }
  }, [navigate]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = (await apiGet<TicketsResponse>("/tickets/deleted")) as Ticket[];
        if (mounted) {
          setTickets(data);
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setError("Erro ao carregar lixeira");
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

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

  const sortedTickets = useMemo(() => {
    if (!sortField || sortOrder === "default") {
      return tickets;
    }

    const sorted = [...tickets].sort((a, b) => {
      let aVal: string | number | undefined = a[sortField];
      let bVal: string | number | undefined = b[sortField];

      // Converter datas para timestamp
      if (sortField === "createdAt" || sortField === "deletedAt") {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }

      if (sortOrder === "asc") {
        return (aVal ?? 0) > (bVal ?? 0) ? 1 : -1;
      } else {
        return (aVal ?? 0) < (bVal ?? 0) ? 1 : -1;
      }
    });

    return sorted;
  }, [tickets, sortField, sortOrder]);

  async function handlePermanentDelete(ticketId: number, ticketTitle: string) {
    const confirmed = await confirm({
      title: "Deletar Permanentemente",
      message: `Tem certeza que deseja deletar permanentemente o ticket "${ticketTitle}"? Esta ação NÃO pode ser desfeita!`,
      confirmText: "Sim, deletar permanentemente",
      cancelText: "Cancelar",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`http://localhost:8080/tickets/${ticketId}/permanent-delete`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${document.cookie.split("token=")[1]?.split(";")[0] || ""}`,
        },
      });

      if (!response.ok) {
        throw new Error("Erro ao deletar permanentemente");
      }

      // Remover da lista
      setTickets(tickets.filter((t) => t.id !== ticketId));
      showSuccess("Ticket deletado permanentemente.");
    } catch (err) {
      console.error("Erro ao deletar ticket:", err);
      showError("Erro ao deletar ticket permanentemente.");
    }
  }

  const columns: DataTableColumn<Ticket>[] = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      className: "data-table__cell--id",
      render: (ticket) => `#${ticket.id}`,
    },
    {
      key: "title",
      label: "Título",
      className: "data-table__cell--title",
    },
    {
      key: "urgency",
      label: "Urgência",
      render: (ticket) => <UrgencyBadge urgency={ticket.urgency || 1} />,
    },
    {
      key: "status",
      label: "Status",
      render: (ticket) => <StatusBadge status={ticket.status} />,
    },
    {
      key: "username",
      label: "Usuário",
      render: (ticket) => ticket.username || "-",
    },
    {
      key: "createdAt",
      label: "Criado em",
      sortable: true,
      className: "data-table__cell--date",
      render: (ticket) => formatDate(ticket.createdAt),
    },
    {
      key: "deletedAt",
      label: "Deletado em",
      sortable: true,
      className: "data-table__cell--date",
      render: (ticket) => formatDate(ticket.deletedAt),
    },
    {
      key: "actions",
      label: "Ações",
      render: (ticket) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePermanentDelete(ticket.id!, ticket.title);
          }}
          className="btn btn--danger-outline btn--sm"
        >
          Apagar
        </button>
      ),
    },
  ];

  return (
    <PageLayout>
      <PageHeader breadcrumbs={[{ label: "Lixeira" }]} />

      <main className="home-page">
        <section className="home-page__filters">
          <div className="summary-card">
            <div className="summary-card__content">
              <div className="summary-card__indicator summary-card__indicator--red" />
              <div className="summary-card__info">
                <p className="summary-card__label">Tickets na Lixeira</p>
                <p className="summary-card__value">{tickets.length}</p>
              </div>
            </div>
          </div>
        </section>

        <DataTable
          columns={columns}
          data={sortedTickets}
          loading={loading}
          error={error}
          emptyMessage="Nenhum ticket na lixeira"
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={handleSort}
          getRowKey={(ticket) => ticket.id!}
        />
      </main>

      {/* Modal de confirmação */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        variant={confirmState.variant}
        onConfirm={confirmState.onConfirm}
        onCancel={handleCancel}
      />
    </PageLayout>
  );
}
