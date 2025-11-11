import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Ticket } from "../services/api";
import { apiGet, getCurrentUserName, getCurrentUserRole } from "../services/api";
import { isAuthenticated, deleteCookie } from "../utils/cookies";
import Sidebar from "../components/Sidebar";
import UserBadge from "../components/UserBadge";

type TicketsResponse = Ticket[] | { message: string };

const STATUS_MAP: Record<number, string> = {
  1: "Aberto",
  2: "Pendente",
  3: "Resolvido",
  4: "Reaberto",
  5: "Aguardando Aprovação",
  6: "Aguardando Exclusão",
  7: "Deletado",
};

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
  const navigate = useNavigate();

  // Proteção de rota: apenas técnicos
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }
    if (getCurrentUserRole() !== "10") {
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

  function handleLogout() {
    deleteCookie("user");
    deleteCookie("token");
    navigate("/login");
  }

  async function handlePermanentDelete(ticketId: number, ticketTitle: string) {
    if (
      !window.confirm(
        `Tem certeza que deseja deletar permanentemente o ticket "${ticketTitle}"? Esta ação NÃO pode ser desfeita!`
      )
    ) {
      return;
    }

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
      alert("Ticket deletado permanentemente.");
    } catch (err) {
      console.error("Erro ao deletar ticket:", err);
      alert("Erro ao deletar ticket permanentemente.");
    }
  }

  if (loading) {
    return (
      <div className="layout">
        <div style={{ padding: "40px", textAlign: "center" }}>Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="layout">
        <div style={{ padding: "40px", color: "red" }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />

      <div
        style={{
          marginLeft: "240px",
          width: "calc(100% - 240px)",
          minHeight: "100vh",
          background: "#f8f9fa",
        }}
      >
        <header
          style={{
            background: "#ffffff",
            borderBottom: "1px solid #e9ecef",
            padding: "12px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#6c757d",
            }}
          >
            <span
              style={{ cursor: "pointer", transition: "color 0.15s" }}
              onClick={() => navigate("/home")}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#212529";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#6c757d";
              }}
            >
              Home
            </span>{" "}
            / <strong style={{ color: "#212529" }}>Lixeira</strong>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                padding: "6px 10px",
                borderRadius: "4px",
                border: "1px solid transparent",
              }}
              onClick={() => navigate("/profile")}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#fafbfc";
                e.currentTarget.style.borderColor = "#e1e4e8";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.borderColor = "transparent";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <UserBadge size={28} fontSize={11} />
              <span style={{ fontSize: "13px", color: "#495057", fontWeight: "500" }}>
                {getCurrentUserName()}
              </span>
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: "transparent",
                color: "#6c757d",
                border: "1px solid #dee2e6",
                padding: "6px 12px",
                borderRadius: "3px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "400",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#dc3545";
                e.currentTarget.style.color = "#dc3545";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#dee2e6";
                e.currentTarget.style.color = "#6c757d";
              }}
            >
              Sair
            </button>
          </div>
        </header>

        <main style={{ padding: "20px" }}>
          <section>
            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  padding: "12px 16px",
                  background: "#fff5f5",
                  border: "1px solid #ffcdd2",
                  borderRadius: "4px",
                  fontSize: "13px",
                  fontWeight: "500",
                  color: "#c62828",
                  display: "inline-block",
                }}
              >
                {tickets.length} Tickets na lixeira
              </div>
            </div>

            <div className="data-table" role="table" aria-label="Tabela de Lixeira">
              <div className="data-table__header" role="row">
                <div role="columnheader">ID</div>
                <div role="columnheader">Título</div>
                <div role="columnheader">Urgência</div>
                <div role="columnheader">Status</div>
                <div role="columnheader">Usuário</div>
                <div role="columnheader">Criado em</div>
                <div role="columnheader">Deletado em</div>
                <div role="columnheader">Ações</div>
              </div>

              {tickets.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#6c757d" }}>
                  Nenhum ticket na lixeira
                </div>
              ) : (
                tickets.map((ticket) => (
                  <div key={ticket.id} className="data-table__row" role="row">
                    <div role="cell">{ticket.id}</div>
                    <div role="cell" style={{ fontWeight: 500 }}>
                      {ticket.title}
                    </div>
                    <div role="cell">
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor:
                            ticket.urgency === 3
                              ? "#dc3545"
                              : ticket.urgency === 2
                              ? "#ffc107"
                              : "#28a745",
                        }}
                      >
                        {ticket.urgency === 3 ? "Alta" : ticket.urgency === 2 ? "Média" : "Baixa"}
                      </span>
                    </div>
                    <div role="cell">
                      <span className="status-badge" style={{ backgroundColor: "#6c757d" }}>
                        {STATUS_MAP[ticket.status]}
                      </span>
                    </div>
                    <div role="cell">{ticket.username || "-"}</div>
                    <div role="cell">{formatDate(ticket.createdAt)}</div>
                    <div role="cell">{formatDate(ticket.deletedAt)}</div>
                    <div role="cell">
                      <button
                        onClick={() => handlePermanentDelete(ticket.id!, ticket.title)}
                        style={{
                          padding: "4px 8px",
                          backgroundColor: "transparent",
                          color: "#dc3545",
                          border: "1px solid #dc3545",
                          borderRadius: "3px",
                          fontSize: "11px",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#dc3545";
                          e.currentTarget.style.color = "white";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "#dc3545";
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
