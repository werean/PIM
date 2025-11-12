import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AIChat from "../components/AIChat";
import ConfirmModal from "../components/ConfirmModal";
import Sidebar from "../components/Sidebar";
import UserBadge from "../components/UserBadge";
import { useConfirm } from "../hooks/useConfirm";
import { useToast } from "../hooks/useToast";
import type { CreateCommentPayload, Ticket } from "../services/api";
import {
  apiGet,
  apiPost,
  getCurrentUserId,
  getCurrentUserName,
  isTechnician,
} from "../services/api";
import { deleteCookie, isAuthenticated } from "../utils/cookies";

const STATUS_MAP: Record<number, string> = {
  1: "Aberto",
  2: "Pendente",
  3: "Resolvido",
  4: "Reaberto",
  5: "Aguardando Aprovação",
  6: "Aguardando Exclusão",
  7: "Deletado",
};

const STATUS_COLOR: Record<number, string> = {
  1: "#2ab849",
  2: "#f2a400",
  3: "#7e7e7e",
  4: "#ff6b6b",
  5: "#ffd43b",
  6: "#ff9800",
  7: "#616161",
};

const URGENCY_MAP: Record<number, string> = {
  1: "Baixa",
  2: "Média",
  3: "Alta",
};

function formatDateTime(dateStr?: string) {
  if (!dateStr) return "-";

  try {
    // O backend já retorna o horário de Brasília, apenas formata
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";

    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yy = String(date.getFullYear());
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yy} às ${hh}:${min}`;
  } catch {
    return "-";
  }
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const { confirm, confirmState, handleCancel } = useConfirm();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [resolutionMessage, setResolutionMessage] = useState("");
  const [isResolvingTicket, setIsResolvingTicket] = useState(false);
  const [isSettingPending, setIsSettingPending] = useState(false);
  const [isApprovingResolution, setIsApprovingResolution] = useState(false);
  const [isRejectingResolution, setIsRejectingResolution] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserId = getCurrentUserId();

  // Proteção de rota
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
    }
  }, [navigate]);

  // Carregar ticket
  useEffect(() => {
    if (!id) return;
    let mounted = true;

    (async () => {
      try {
        const data = await apiGet<Ticket>(`/tickets/${id}`);
        if (!mounted) return;
        setTicket(data);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Erro ao carregar ticket";
        if (mounted) {
          setError(msg);
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
  }, [id]);

  // Scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.comments]);

  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();

    // Validação
    if (!message.trim()) {
      setError("Mensagem não pode estar vazia");
      return;
    }

    if (message.trim().length < 3) {
      setError("Mensagem deve ter no mínimo 3 caracteres");
      return;
    }

    if (!id) {
      setError("ID do ticket inválido");
      return;
    }

    setSending(true);
    setError(null);

    try {
      const payload: CreateCommentPayload = {
        ticketId: Number(id),
        commentBody: message.trim(),
      };

      console.log("Enviando comentário...");
      await apiPost("/comments", payload);
      console.log("Comentário enviado com sucesso");

      // Recarregar ticket para atualizar comentários
      const updatedTicket = await apiGet<Ticket>(`/tickets/${id}`);
      setTicket(updatedTicket);
      setMessage("");
    } catch (err: unknown) {
      console.error("Erro ao enviar mensagem:", err);
      const error = err as {
        response?: {
          data?: { message?: string; errors?: string[] };
          status?: number;
        };
        message?: string;
      };

      let errorMessage = "Erro ao enviar mensagem";

      if (error.response?.status === 403) {
        errorMessage = "Você não tem permissão para comentar neste ticket";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      showError(errorMessage);
    } finally {
      setSending(false);
    }
  }

  async function handleResolveTicket(e: FormEvent) {
    e.preventDefault();

    // Validação
    if (!resolutionMessage.trim()) {
      setError("Mensagem de resolução não pode estar vazia");
      return;
    }

    if (resolutionMessage.trim().length < 10) {
      setError("Mensagem de resolução deve ter no mínimo 10 caracteres");
      return;
    }

    if (!id) {
      setError("ID do ticket inválido");
      return;
    }

    setIsResolvingTicket(true);
    setError(null);

    try {
      console.log(`Resolvendo ticket ${id}...`);
      await apiPost(`/tickets/${id}/resolve`, {
        resolutionMessage: resolutionMessage.trim(),
      });
      console.log("Ticket resolvido com sucesso");

      // Recarregar ticket para atualizar status
      const updatedTicket = await apiGet<Ticket>(`/tickets/${id}`);
      setTicket(updatedTicket);
      setResolutionMessage("");
    } catch (err: unknown) {
      console.error("Erro ao resolver ticket:", err);
      const error = err as {
        response?: {
          data?: { message?: string; errors?: string[]; error?: string };
          status?: number;
        };
        message?: string;
      };

      let errorMessage = "Erro ao resolver ticket";

      if (error.response?.status === 404) {
        errorMessage = "Ticket não encontrado";
      } else if (error.response?.status === 403) {
        errorMessage = "Você não tem permissão para resolver tickets";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      showError(errorMessage);
    } finally {
      setIsResolvingTicket(false);
    }
  }

  async function handleTogglePending() {
    if (!id) {
      setError("ID do ticket inválido");
      return;
    }

    setIsSettingPending(true);
    setError(null);

    try {
      if (ticket?.status === 2) {
        // Se está pendente, retomar (voltar para status 1 - Aberto)
        console.log(`Tentando reabrir ticket ${id}...`);
        await apiPost(`/tickets/${id}/reopen`, {});
        console.log("Ticket reaberto com sucesso");
      } else {
        // Se está aberto, pausar (status 2 - Pendente)
        console.log(`Tentando pausar ticket ${id}...`);
        await apiPost(`/tickets/${id}/pending`, {});
        console.log("Ticket pausado com sucesso");
      }

      // Recarregar ticket para atualizar status
      const updatedTicket = await apiGet<Ticket>(`/tickets/${id}`);
      setTicket(updatedTicket);
    } catch (err: unknown) {
      console.error("Erro ao alterar status do ticket:", err);
      const error = err as {
        response?: {
          data?: { message?: string; error?: string };
          status?: number;
        };
        message?: string;
      };

      let errorMessage = "Erro ao alterar status do ticket";

      if (error.response?.status === 404) {
        errorMessage = "Ticket não encontrado ou endpoint não disponível";
      } else if (error.response?.status === 403) {
        errorMessage = "Você não tem permissão para realizar esta ação";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      showError(errorMessage);
    } finally {
      setIsSettingPending(false);
    }
  }

  async function handleApproveResolution() {
    if (!id) return;
    setIsApprovingResolution(true);
    setError(null);

    try {
      await apiPost(`/tickets/${id}/approve-resolution`, {});
      const updatedTicket = await apiGet<Ticket>(`/tickets/${id}`);
      setTicket(updatedTicket);
      showSuccess("Solução aprovada! O ticket foi fechado.");
    } catch (err) {
      console.error("Erro ao aprovar solução:", err);
      setError("Erro ao aprovar solução");
    } finally {
      setIsApprovingResolution(false);
    }
  }

  async function handleRejectResolution() {
    if (!id || !ticket) return;
    setIsRejectingResolution(true);
    setError(null);

    try {
      // Salvar a mensagem de resolução antes de rejeitar
      const rejectedMessage = ticket.resolutionMessage;

      // Rejeitar a solução (reabre o ticket)
      await apiPost(`/tickets/${id}/reject-resolution`, {});

      // Criar comentário automático com a solução rejeitada
      if (rejectedMessage) {
        await apiPost("/comments", {
          ticketId: parseInt(id),
          commentBody: `[SOLUÇÃO REJEITADA]\n\n${rejectedMessage}`,
        });
      }

      // Recarregar ticket para mostrar novo comentário
      const updatedTicket = await apiGet<Ticket>(`/tickets/${id}`);
      setTicket(updatedTicket);

      showWarning(
        "Solução rejeitada. O ticket foi reaberto. Você pode enviar uma nova mensagem."
      );

      // Focar no campo de mensagem
      setTimeout(() => {
        document
          .querySelector<HTMLTextAreaElement>(
            'textarea[placeholder="Digite sua mensagem..."]'
          )
          ?.focus();
      }, 100);
    } catch (err) {
      console.error("Erro ao rejeitar solução:", err);
      setError("Erro ao rejeitar solução");
    } finally {
      setIsRejectingResolution(false);
    }
  }

  async function handleUpdateDescription() {
    if (!id || !editedDescription.trim()) return;

    if (editedDescription.trim().length < 10) {
      setEditError("A descrição deve ter pelo menos 10 caracteres");
      return;
    }

    setEditError(null);
    try {
      // Usar fetch com método PUT
      const response = await fetch(
        `http://localhost:8080/tickets/${id}/description`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${
              document.cookie.split("token=")[1]?.split(";")[0] || ""
            }`,
          },
          body: JSON.stringify({ ticketBody: editedDescription.trim() }),
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Erro ao atualizar" }));
        throw new Error(errorData.message || "Erro ao atualizar descrição");
      }

      const updatedTicket = await apiGet<Ticket>(`/tickets/${id}`);
      setTicket(updatedTicket);
      setIsEditingDescription(false);
      setEditedDescription("");
      setEditError(null);
      showSuccess("Descrição atualizada com sucesso!");
    } catch (err) {
      console.error("Erro ao atualizar descrição:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao atualizar descrição";
      setEditError(errorMessage);
    }
  }

  async function handleRequestDeletion() {
    if (!id) return;

    const confirmed = await confirm({
      title: "Solicitar Exclusão",
      message: "Tem certeza que deseja solicitar a exclusão deste ticket?",
      confirmText: "Sim, solicitar",
      cancelText: "Cancelar",
      variant: "warning",
    });

    if (!confirmed) return;

    try {
      await apiPost(`/tickets/${id}/request-deletion`, {});
      const updatedTicket = await apiGet<Ticket>(`/tickets/${id}`);
      setTicket(updatedTicket);
      showInfo("Solicitação de exclusão enviada ao usuário.");
    } catch (err) {
      console.error("Erro ao solicitar exclusão:", err);
      setError("Erro ao solicitar exclusão");
    }
  }

  async function handleApproveDeletion() {
    if (!id) return;

    const confirmed = await confirm({
      title: "Mover para Lixeira",
      message: "Tem certeza que deseja mover este ticket para a lixeira?",
      confirmText: "Sim, mover",
      cancelText: "Cancelar",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      await apiPost(`/tickets/${id}/approve-deletion`, {});
      showSuccess("Ticket movido para a lixeira.");
      navigate("/home");
    } catch (err) {
      console.error("Erro ao aprovar exclusão:", err);
      setError("Erro ao aprovar exclusão");
    }
  }

  async function handleRejectDeletion() {
    if (!id) return;

    try {
      await apiPost(`/tickets/${id}/reject-deletion`, {});

      // Criar comentário automático
      await apiPost("/comments", {
        ticketId: parseInt(id),
        commentBody:
          "[EXCLUSÃO RECUSADA]\n\nO usuário rejeitou a solicitação de exclusão deste ticket.",
      });

      const updatedTicket = await apiGet<Ticket>(`/tickets/${id}`);
      setTicket(updatedTicket);
      showInfo("Solicitação de exclusão rejeitada.");
    } catch (err) {
      console.error("Erro ao rejeitar exclusão:", err);
      setError("Erro ao rejeitar exclusão");
    }
  }

  if (loading) {
    return (
      <div className="layout">
        <div style={{ padding: "40px", textAlign: "center" }}>
          Carregando...
        </div>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="layout">
        <div style={{ padding: "40px", textAlign: "center", color: "#dc3545" }}>
          {error}
          <br />
          <Link
            to="/home"
            style={{
              color: "#007bff",
              marginTop: "20px",
              display: "inline-block",
            }}
          >
            ← Voltar para lista
          </Link>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return null;
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
            /{" "}
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
              Chamados
            </span>{" "}
            / <strong style={{ color: "#212529" }}>#{ticket.id}</strong>
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
              <span
                style={{
                  fontSize: "13px",
                  color: "#495057",
                  fontWeight: "500",
                }}
              >
                {getCurrentUserName()}
              </span>
            </div>
            <button
              onClick={() => {
                deleteCookie("token");
                deleteCookie("user");
                navigate("/login");
              }}
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
          <div style={{ marginBottom: "20px" }}>
            <Link
              to="/home"
              style={{ color: "#007bff", textDecoration: "none" }}
            >
              ← Voltar para lista de chamados
            </Link>
          </div>

          {/* Informações do Ticket */}
          <div
            style={{
              background: "white",
              borderRadius: "4px",
              padding: "16px",
              marginBottom: "16px",
              border: "1px solid #e9ecef",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "start",
                marginBottom: "12px",
              }}
            >
              <div>
                <h1
                  style={{
                    margin: "0 0 6px 0",
                    fontSize: "18px",
                    fontWeight: "600",
                    color: "#212529",
                  }}
                >
                  {ticket.title}
                </h1>
                <p style={{ margin: 0, color: "#868e96", fontSize: "12px" }}>
                  Criado por <strong>{ticket.username}</strong> em{" "}
                  {formatDateTime(ticket.createdAt)}
                </p>
              </div>
              <span
                style={{
                  display: "inline-block",
                  padding: "4px 10px",
                  borderRadius: "3px",
                  fontSize: "11px",
                  fontWeight: "500",
                  color: STATUS_COLOR[ticket.status],
                  backgroundColor: `${STATUS_COLOR[ticket.status]}15`,
                  border: `1px solid ${STATUS_COLOR[ticket.status]}40`,
                }}
              >
                {STATUS_MAP[ticket.status]}
              </span>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "4px",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontWeight: "600",
                    fontSize: "14px",
                    color: "#495057",
                  }}
                >
                  Descrição:
                </p>
                <div style={{ display: "flex", gap: "6px" }}>
                  {ticket.userId === currentUserId && !isEditingDescription && (
                    <button
                      onClick={() => {
                        setIsEditingDescription(true);
                        setEditedDescription(ticket.ticketBody || "");
                      }}
                      style={{
                        padding: "4px 8px",
                        backgroundColor: "transparent",
                        color: "#6c757d",
                        border: "1px solid #dee2e6",
                        borderRadius: "3px",
                        fontSize: "11px",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#007bff";
                        e.currentTarget.style.color = "#007bff";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#dee2e6";
                        e.currentTarget.style.color = "#6c757d";
                      }}
                    >
                      ✏️ Editar
                    </button>
                  )}
                  {isTechnician() &&
                    !ticket.isDeleted &&
                    !ticket.pendingDeletion && (
                      <button
                        onClick={handleRequestDeletion}
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
                    )}
                </div>
              </div>
              {isEditingDescription ? (
                <div>
                  <textarea
                    value={editedDescription}
                    onChange={(e) => {
                      setEditedDescription(e.target.value);
                      setEditError(null); // Limpar erro ao digitar
                    }}
                    rows={6}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: editError
                        ? "1px solid #dc3545"
                        : "1px solid #ced4da",
                      fontFamily: "inherit",
                      marginBottom: "8px",
                    }}
                  />
                  {editError && (
                    <div
                      style={{
                        padding: "8px 12px",
                        marginBottom: "8px",
                        background: "#f8d7da",
                        color: "#721c24",
                        borderRadius: "4px",
                        fontSize: "13px",
                      }}
                    >
                      {editError}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={handleUpdateDescription}
                      style={{
                        padding: "5px 12px",
                        backgroundColor: "transparent",
                        color: "#28a745",
                        border: "1px solid #28a745",
                        borderRadius: "3px",
                        fontSize: "12px",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#28a745";
                        e.currentTarget.style.color = "white";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "#28a745";
                      }}
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingDescription(false);
                        setEditedDescription("");
                        setEditError(null);
                      }}
                      style={{
                        padding: "5px 12px",
                        backgroundColor: "transparent",
                        color: "#6c757d",
                        border: "1px solid #dee2e6",
                        borderRadius: "3px",
                        fontSize: "12px",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#6c757d";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#dee2e6";
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  style={{
                    margin: 0,
                    color: "#212529",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {ticket.ticketBody || "Sem descrição"}
                </p>
              )}
              {ticket.editedAt && !isEditingDescription && (
                <p
                  style={{
                    margin: "8px 0 0 0",
                    fontSize: "12px",
                    color: "#6c757d",
                    fontStyle: "italic",
                  }}
                >
                  Editado por {ticket.editedByUsername || "Usuário"} em{" "}
                  {formatDateTime(ticket.editedAt)}
                </p>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "baseline", gap: "8px" }}
              >
                <p
                  style={{
                    margin: 0,
                    fontWeight: "600",
                    fontSize: "14px",
                    color: "#495057",
                  }}
                >
                  Urgência:
                </p>
                <p style={{ margin: 0 }}>{URGENCY_MAP[ticket.urgency]}</p>
              </div>
              <div
                style={{ display: "flex", alignItems: "baseline", gap: "8px" }}
              >
                <p
                  style={{
                    margin: 0,
                    fontWeight: "600",
                    fontSize: "14px",
                    color: "#495057",
                  }}
                >
                  Última atualização:
                </p>
                <p style={{ margin: 0 }}>{formatDateTime(ticket.updatedAt)}</p>
              </div>
            </div>
          </div>

          {/* Área de Mensagens */}
          <div
            style={{
              background: "white",
              borderRadius: "4px",
              border: "1px solid #e9ecef",
              display: "flex",
              flexDirection: "column",
              height: "500px",
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid #e9ecef",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#495057",
                }}
              >
                Mensagens ({ticket.comments?.length || 0})
              </h2>
            </div>

            {/* Lista de Mensagens */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {!ticket.comments || ticket.comments.length === 0 ? (
                <p
                  style={{
                    textAlign: "center",
                    color: "#6c757d",
                    marginTop: "40px",
                  }}
                >
                  Nenhuma mensagem ainda. Seja o primeiro a comentar!
                </p>
              ) : (
                ticket.comments.map((comment) => {
                  const isOwn = comment.userId === currentUserId;
                  const isRejectedSolution = comment.commentBody.startsWith(
                    "[SOLUÇÃO REJEITADA]"
                  );
                  const isRejectedDeletion = comment.commentBody.startsWith(
                    "[EXCLUSÃO RECUSADA]"
                  );
                  const messageContent = isRejectedSolution
                    ? comment.commentBody.replace("[SOLUÇÃO REJEITADA]\n\n", "")
                    : isRejectedDeletion
                    ? comment.commentBody.replace("[EXCLUSÃO RECUSADA]\n\n", "")
                    : comment.commentBody;

                  return (
                    <div
                      key={comment.id}
                      style={{
                        display: "flex",
                        justifyContent: isOwn ? "flex-end" : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "70%",
                          padding: "10px 12px",
                          borderRadius: "4px",
                          backgroundColor:
                            isRejectedSolution || isRejectedDeletion
                              ? "#fff9f0"
                              : isOwn
                              ? "#e3f2fd"
                              : "#f5f5f5",
                          color:
                            isRejectedSolution || isRejectedDeletion
                              ? "#6c5400"
                              : isOwn
                              ? "#1565c0"
                              : "#212529",
                          border:
                            isRejectedSolution || isRejectedDeletion
                              ? "1px solid #ffe0b2"
                              : isOwn
                              ? "1px solid #bbdefb"
                              : "1px solid #e0e0e0",
                        }}
                      >
                        {isRejectedSolution && (
                          <div
                            style={{
                              display: "inline-block",
                              padding: "2px 6px",
                              backgroundColor: "#fdecea",
                              color: "#c62828",
                              border: "1px solid #ef9a9a",
                              borderRadius: "3px",
                              fontSize: "9px",
                              fontWeight: "600",
                              textTransform: "uppercase",
                              letterSpacing: "0.3px",
                              marginBottom: "6px",
                            }}
                          >
                            ✗ Solução Reprovada
                          </div>
                        )}
                        {isRejectedDeletion && (
                          <div
                            style={{
                              display: "inline-block",
                              padding: "2px 6px",
                              backgroundColor: "#f5f5f5",
                              color: "#616161",
                              border: "1px solid #e0e0e0",
                              borderRadius: "3px",
                              fontSize: "9px",
                              fontWeight: "600",
                              textTransform: "uppercase",
                              letterSpacing: "0.3px",
                              marginBottom: "6px",
                            }}
                          >
                            ✗ Exclusão Recusada
                          </div>
                        )}
                        <div
                          style={{
                            fontSize: "10px",
                            fontWeight: "600",
                            marginBottom: "3px",
                            opacity: 0.75,
                          }}
                        >
                          {comment.username}
                        </div>
                        <div
                          style={{
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            fontSize: "13px",
                            lineHeight: "1.4",
                          }}
                        >
                          {messageContent}
                        </div>
                        <div
                          style={{
                            fontSize: "10px",
                            marginTop: "3px",
                            opacity: 0.6,
                          }}
                        >
                          {formatDateTime(comment.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Card de Solução FORA da área de mensagens - Aguardando aprovação (status 5) */}
            {ticket.status === 5 &&
              ticket.resolutionMessage &&
              !isTechnician() && (
                <div
                  style={{
                    padding: "12px",
                    backgroundColor: "#fffbf0",
                    border: "1px solid #f0e8d0",
                    borderRadius: "4px",
                    margin: "12px 16px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: "500",
                      color: "#856404",
                      marginBottom: "6px",
                      textTransform: "uppercase",
                      letterSpacing: "0.3px",
                    }}
                  >
                    Solução Proposta
                  </div>
                  <p
                    style={{
                      margin: "0 0 10px 0",
                      whiteSpace: "pre-wrap",
                      color: "#495057",
                      lineHeight: "1.4",
                      fontSize: "13px",
                    }}
                  >
                    {ticket.resolutionMessage}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      justifyContent: "flex-end",
                    }}
                  >
                    <button
                      onClick={handleRejectResolution}
                      disabled={isRejectingResolution}
                      style={{
                        padding: "4px 10px",
                        backgroundColor: "transparent",
                        color: "#6c757d",
                        border: "1px solid #dee2e6",
                        borderRadius: "3px",
                        fontSize: "11px",
                        fontWeight: "400",
                        cursor: isRejectingResolution
                          ? "not-allowed"
                          : "pointer",
                        opacity: isRejectingResolution ? 0.6 : 1,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isRejectingResolution) {
                          e.currentTarget.style.borderColor = "#dc3545";
                          e.currentTarget.style.color = "#dc3545";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isRejectingResolution) {
                          e.currentTarget.style.borderColor = "#dee2e6";
                          e.currentTarget.style.color = "#6c757d";
                        }
                      }}
                    >
                      {isRejectingResolution ? "Rejeitando..." : "Rejeitar"}
                    </button>
                    <button
                      onClick={handleApproveResolution}
                      disabled={isApprovingResolution}
                      style={{
                        padding: "4px 10px",
                        backgroundColor: "transparent",
                        color: "#28a745",
                        border: "1px solid #28a745",
                        borderRadius: "3px",
                        fontSize: "11px",
                        fontWeight: "400",
                        cursor: isApprovingResolution
                          ? "not-allowed"
                          : "pointer",
                        opacity: isApprovingResolution ? 0.6 : 1,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isApprovingResolution) {
                          e.currentTarget.style.backgroundColor = "#28a745";
                          e.currentTarget.style.color = "white";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isApprovingResolution) {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "#28a745";
                        }
                      }}
                    >
                      {isApprovingResolution ? "Aprovando..." : "Aprovar"}
                    </button>
                  </div>
                </div>
              )}

            {/* Card de aprovação de exclusão - apenas para o criador do ticket */}
            {ticket.pendingDeletion && !isTechnician() && (
              <div
                style={{
                  background: "#fff9f0",
                  border: "1px solid #ffe0b2",
                  padding: "12px",
                  borderRadius: "4px",
                  margin: "12px 16px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: "500",
                    color: "#e65100",
                    marginBottom: "6px",
                    textTransform: "uppercase",
                    letterSpacing: "0.3px",
                  }}
                >
                  ⚠ Solicitação de Exclusão
                </div>
                <p
                  style={{
                    margin: "0 0 10px 0",
                    color: "#6c5400",
                    lineHeight: "1.4",
                    fontSize: "13px",
                  }}
                >
                  Um técnico solicitou a exclusão deste ticket.
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    onClick={handleRejectDeletion}
                    style={{
                      padding: "4px 10px",
                      backgroundColor: "transparent",
                      color: "#6c757d",
                      border: "1px solid #dee2e6",
                      borderRadius: "3px",
                      fontSize: "11px",
                      fontWeight: "400",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#6c757d";
                      e.currentTarget.style.color = "#495057";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#dee2e6";
                      e.currentTarget.style.color = "#6c757d";
                    }}
                  >
                    Recusar
                  </button>
                  <button
                    onClick={handleApproveDeletion}
                    style={{
                      padding: "4px 10px",
                      backgroundColor: "transparent",
                      color: "#dc3545",
                      border: "1px solid #dc3545",
                      borderRadius: "3px",
                      fontSize: "11px",
                      fontWeight: "400",
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
                    Aprovar
                  </button>
                </div>
              </div>
            )}

            {/* Formulário de Envio */}
            <div
              style={{ padding: "12px 16px", borderTop: "1px solid #e9ecef" }}
            >
              {error && (
                <div
                  style={{
                    padding: "8px 10px",
                    marginBottom: "10px",
                    background: "#fdecea",
                    color: "#c62828",
                    border: "1px solid #ef9a9a",
                    borderRadius: "3px",
                    fontSize: "12px",
                  }}
                >
                  {error}
                </div>
              )}
              <form
                onSubmit={handleSendMessage}
                style={{ display: "flex", gap: "8px", alignItems: "stretch" }}
              >
                <textarea
                  placeholder={
                    ticket.status === 3 && !isTechnician()
                      ? "Ticket resolvido e aprovado"
                      : ticket.status === 5 && !isTechnician()
                      ? "Aguardando sua aprovação da solução..."
                      : "Digite sua mensagem..."
                  }
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={
                    sending ||
                    (ticket.status === 5 && !isTechnician()) ||
                    (ticket.status === 3 && !isTechnician())
                  }
                  rows={2}
                  style={{
                    flex: 1,
                    margin: 0,
                    resize: "none",
                    fontFamily: "inherit",
                    padding: "10px",
                    fontSize: "13px",
                    border: "1px solid #e0e0e0",
                    borderRadius: "3px",
                    outline: "none",
                    opacity:
                      (ticket.status === 5 && !isTechnician()) ||
                      (ticket.status === 3 && !isTechnician())
                        ? 0.6
                        : 1,
                    cursor:
                      (ticket.status === 5 && !isTechnician()) ||
                      (ticket.status === 3 && !isTechnician())
                        ? "not-allowed"
                        : "text",
                  }}
                />
                <button
                  type="submit"
                  disabled={
                    sending ||
                    !message.trim() ||
                    (ticket.status === 5 && !isTechnician()) ||
                    (ticket.status === 3 && !isTechnician())
                  }
                  style={{
                    margin: 0,
                    padding: "0 16px",
                    background: "transparent",
                    color: "#007bff",
                    border: "1px solid #007bff",
                    borderRadius: "3px",
                    cursor:
                      sending || !message.trim() ? "not-allowed" : "pointer",
                    fontSize: "12px",
                    fontWeight: "400",
                    transition: "all 0.15s",
                    opacity: sending || !message.trim() ? 0.5 : 1,
                    minWidth: "80px",
                  }}
                  onMouseEnter={(e) => {
                    if (!sending && message.trim()) {
                      e.currentTarget.style.background = "#007bff";
                      e.currentTarget.style.color = "white";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!sending && message.trim()) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#007bff";
                    }
                  }}
                >
                  {sending ? "..." : "Enviar"}
                </button>
              </form>

              {/* Solução Aprovada - Mostrar abaixo do formulário quando ticket resolvido (status 3) */}
              {ticket.status === 3 &&
                ticket.resolutionMessage &&
                !isTechnician() && (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "10px 12px",
                      backgroundColor: "#f0f8f0",
                      border: "1px solid #d0e8d0",
                      borderRadius: "4px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: "500",
                        color: "#28a745",
                        marginBottom: "6px",
                        textTransform: "uppercase",
                        letterSpacing: "0.3px",
                      }}
                    >
                      ✓ Solução Aprovada
                    </div>
                    <p
                      style={{
                        margin: 0,
                        whiteSpace: "pre-wrap",
                        color: "#495057",
                        lineHeight: "1.4",
                        fontSize: "13px",
                      }}
                    >
                      {ticket.resolutionMessage}
                    </p>
                  </div>
                )}
            </div>
          </div>

          {/* Área de Resolução - apenas para técnicos */}
          {isTechnician() && ticket && (
            <div
              style={{
                background: "white",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                marginTop: "20px",
                padding: "24px",
              }}
            >
              {ticket.status === 3 ? (
                // Ticket já resolvido - mostrar apenas a solução
                <div>
                  <h3
                    style={{
                      margin: "0 0 16px 0",
                      fontSize: "18px",
                      fontWeight: "600",
                      color: "#155724",
                    }}
                  >
                    ✅ Ticket Resolvido
                  </h3>
                  <div
                    style={{
                      padding: "16px",
                      background: "#d4edda",
                      borderRadius: "6px",
                      border: "1px solid #c3e6cb",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 8px 0",
                        fontWeight: "600",
                        fontSize: "14px",
                        color: "#155724",
                      }}
                    >
                      Solução:
                    </p>
                    <p
                      style={{
                        margin: 0,
                        color: "#155724",
                        whiteSpace: "pre-wrap",
                        lineHeight: "1.6",
                      }}
                    >
                      {ticket.resolutionMessage}
                    </p>
                  </div>
                </div>
              ) : (
                // Ticket ainda não resolvido - mostrar formulário
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "16px",
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "18px",
                        fontWeight: "600",
                        color: "#495057",
                      }}
                    >
                      Gerenciar Ticket
                    </h3>
                    <button
                      type="button"
                      onClick={handleTogglePending}
                      disabled={isSettingPending}
                      style={{
                        padding: "8px 16px",
                        background: ticket.status === 2 ? "#28a745" : "#f2a400",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: isSettingPending ? "not-allowed" : "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                        transition: "background 0.2s",
                        opacity: isSettingPending ? 0.6 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!isSettingPending) {
                          e.currentTarget.style.background =
                            ticket.status === 2 ? "#218838" : "#d89000";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSettingPending) {
                          e.currentTarget.style.background =
                            ticket.status === 2 ? "#28a745" : "#f2a400";
                        }
                      }}
                    >
                      {isSettingPending
                        ? ticket.status === 2
                          ? "Retomando..."
                          : "Pausando..."
                        : ticket.status === 2
                        ? "▶ Retomar Atendimento"
                        : "⏸ Pausar Atendimento"}
                    </button>
                  </div>

                  {ticket.status === 2 && (
                    <div
                      style={{
                        padding: "12px",
                        marginBottom: "16px",
                        background: "#fff3cd",
                        border: "1px solid #ffeaa7",
                        borderRadius: "6px",
                        color: "#856404",
                        fontSize: "14px",
                      }}
                    >
                      ⏸ Este ticket está <strong>pausado/pendente</strong>.
                      Clique em "Retomar Atendimento" para continuar ou preencha
                      a solução abaixo para fechá-lo.
                    </div>
                  )}

                  <form onSubmit={handleResolveTicket}>
                    <div style={{ marginBottom: "16px" }}>
                      <label
                        htmlFor="resolution"
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontWeight: "500",
                          fontSize: "14px",
                          color: "#495057",
                        }}
                      >
                        Descreva a solução do problema *
                      </label>
                      <textarea
                        id="resolution"
                        className="login-form__input"
                        placeholder="Descreva como o problema foi resolvido..."
                        value={resolutionMessage}
                        onChange={(e) => setResolutionMessage(e.target.value)}
                        disabled={isResolvingTicket}
                        rows={5}
                        style={{
                          width: "100%",
                          resize: "vertical",
                          fontFamily: "inherit",
                          padding: "12px",
                          margin: 0,
                        }}
                        required
                      />
                      <p
                        style={{
                          margin: "4px 0 0 0",
                          fontSize: "12px",
                          color: "#6c757d",
                        }}
                      >
                        Mínimo de 10 caracteres
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={
                        isResolvingTicket ||
                        resolutionMessage.trim().length < 10
                      }
                      style={{
                        padding: "12px 24px",
                        background: "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor:
                          isResolvingTicket ||
                          resolutionMessage.trim().length < 10
                            ? "not-allowed"
                            : "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                        transition: "background 0.2s",
                        opacity:
                          isResolvingTicket ||
                          resolutionMessage.trim().length < 10
                            ? 0.6
                            : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (
                          !isResolvingTicket &&
                          resolutionMessage.trim().length >= 10
                        ) {
                          e.currentTarget.style.background = "#218838";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#28a745";
                      }}
                    >
                      {isResolvingTicket
                        ? "Resolvendo..."
                        : "Resolver e Fechar Ticket"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Chat com IA - apenas para técnicos */}
      {isTechnician() && ticket && (
        <AIChat
          ticketId={id || ""}
          ticketTitle={ticket.title}
          ticketBody={ticket.ticketBody || ""}
        />
      )}

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
    </div>
  );
}
