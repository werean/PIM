import { useState, useEffect, useRef, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  apiGet,
  apiPost,
  getCurrentUserId,
  getCurrentUserName,
  getCurrentUserRole,
  isTechnician,
} from "../services/api";
import type { Ticket, CreateCommentPayload } from "../services/api";
import { isAuthenticated, deleteCookie } from "../utils/cookies";
import logoLJFT from "../assets/images/logoLJFT.png";
import AIChat from "../components/AIChat";

function UserBadge() {
  const userName = getCurrentUserName();
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
  return <span className="user-badge__initials">{initials}</span>;
}

const STATUS_MAP: Record<number, string> = {
  1: "Aberto",
  2: "Pendente",
  3: "Resolvido",
};

const STATUS_COLOR: Record<number, string> = {
  1: "#2ab849",
  2: "#f2a400",
  3: "#7e7e7e",
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
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
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
        const msg = err instanceof Error ? err.message : "Erro ao carregar ticket";
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
    if (!message.trim() || !id) return;

    setSending(true);
    setError(null);

    try {
      const payload: CreateCommentPayload = {
        ticketId: Number(id),
        commentBody: message.trim(),
      };

      await apiPost("/comments", payload);

      // Recarregar ticket para atualizar comentários
      const updatedTicket = await apiGet<Ticket>(`/tickets/${id}`);
      setTicket(updatedTicket);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="layout">
        <div style={{ padding: "40px", textAlign: "center" }}>Carregando...</div>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="layout">
        <div style={{ padding: "40px", textAlign: "center", color: "#dc3545" }}>
          {error}
          <br />
          <Link to="/home" style={{ color: "#007bff", marginTop: "20px", display: "inline-block" }}>
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
    <div className="layout">
      <aside className="sidenav" aria-label="Menu lateral">
        <div className="sidenav__brand">
          <img className="sidenav__brand-image" src={logoLJFT} alt="Logo LJFT" />
          <button className="sidenav__toggle" type="button">
            {"<< Recolher menu"}
          </button>
        </div>
        <nav className="sidenav__nav" aria-label="Navegação">
          <p className="sidenav__section">Menu</p>
          <div className="sidenav__submenu">
            <Link to="/home" className="sidenav__submenu-item">
              Chamados
            </Link>
            <Link to="/ticket/new" className="sidenav__submenu-item">
              Criar chamados
            </Link>
          </div>
        </nav>
      </aside>

      <div className="layout__main">
        <header className="topbar">
          <div className="topbar__breadcrumb">
            Home / Chamados / <strong>#{ticket.id}</strong>
          </div>

          <div
            className="topbar__controls"
            style={{ display: "flex", alignItems: "center", gap: "10px" }}
          >
            <div className="user-badge">
              {getCurrentUserRole()} <UserBadge />
            </div>
            <button
              onClick={() => {
                deleteCookie("token");
                deleteCookie("user");
                navigate("/login");
              }}
              style={{
                background: "#dc3545",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              Sair
            </button>
          </div>
        </header>

        <main className="layout__content">
          <div style={{ marginBottom: "20px" }}>
            <Link to="/home" style={{ color: "#007bff", textDecoration: "none" }}>
              ← Voltar para lista de chamados
            </Link>
          </div>

          {/* Informações do Ticket */}
          <div
            style={{
              background: "white",
              borderRadius: "8px",
              padding: "24px",
              marginBottom: "20px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "start",
                marginBottom: "16px",
              }}
            >
              <div>
                <h1 style={{ margin: "0 0 8px 0", fontSize: "24px", fontWeight: "600" }}>
                  {ticket.title}
                </h1>
                <p style={{ margin: 0, color: "#6c757d", fontSize: "14px" }}>
                  Criado por <strong>{ticket.username}</strong> em{" "}
                  {formatDateTime(ticket.createdAt)}
                </p>
              </div>
              <span
                style={{
                  display: "inline-block",
                  padding: "6px 12px",
                  borderRadius: "4px",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "white",
                  backgroundColor: STATUS_COLOR[ticket.status],
                }}
              >
                {STATUS_MAP[ticket.status]}
              </span>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <p
                style={{
                  margin: "0 0 4px 0",
                  fontWeight: "600",
                  fontSize: "14px",
                  color: "#495057",
                }}
              >
                Descrição:
              </p>
              <p style={{ margin: 0, color: "#212529", whiteSpace: "pre-wrap" }}>
                {ticket.ticketBody || "Sem descrição"}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <p style={{ margin: 0, fontWeight: "600", fontSize: "14px", color: "#495057" }}>
                  Urgência:
                </p>
                <p style={{ margin: 0 }}>{URGENCY_MAP[ticket.urgency]}</p>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <p style={{ margin: 0, fontWeight: "600", fontSize: "14px", color: "#495057" }}>
                  Última atualização:
                </p>
                <p style={{ margin: 0 }}>{formatDateTime(ticket.updatedAt)}</p>
              </div>
            </div>

            {ticket.resolutionMessage && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "12px",
                  background: "#d4edda",
                  borderRadius: "4px",
                }}
              >
                <p
                  style={{
                    margin: "0 0 4px 0",
                    fontWeight: "600",
                    fontSize: "14px",
                    color: "#155724",
                  }}
                >
                  Mensagem de Resolução:
                </p>
                <p style={{ margin: 0, color: "#155724" }}>{ticket.resolutionMessage}</p>
              </div>
            )}
          </div>

          {/* Área de Mensagens */}
          <div
            style={{
              background: "white",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              display: "flex",
              flexDirection: "column",
              height: "500px",
            }}
          >
            <div style={{ padding: "16px", borderBottom: "1px solid #dee2e6" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>
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
                gap: "12px",
              }}
            >
              {!ticket.comments || ticket.comments.length === 0 ? (
                <p style={{ textAlign: "center", color: "#6c757d", marginTop: "40px" }}>
                  Nenhuma mensagem ainda. Seja o primeiro a comentar!
                </p>
              ) : (
                ticket.comments.map((comment) => {
                  const isOwn = comment.userId === currentUserId;
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
                          padding: "12px 16px",
                          borderRadius: "8px",
                          backgroundColor: isOwn ? "#007bff" : "#f1f3f5",
                          color: isOwn ? "white" : "#212529",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: "600",
                            marginBottom: "4px",
                            opacity: 0.9,
                          }}
                        >
                          {comment.username}
                        </div>
                        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {comment.commentBody}
                        </div>
                        <div style={{ fontSize: "11px", marginTop: "4px", opacity: 0.7 }}>
                          {formatDateTime(comment.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Formulário de Envio */}
            <div style={{ padding: "16px", borderTop: "1px solid #dee2e6" }}>
              {error && (
                <div
                  style={{
                    padding: "8px 12px",
                    marginBottom: "12px",
                    background: "#f8d7da",
                    color: "#721c24",
                    borderRadius: "4px",
                    fontSize: "14px",
                  }}
                >
                  {error}
                </div>
              )}
              <form
                onSubmit={handleSendMessage}
                style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}
              >
                <textarea
                  className="login-form__input"
                  placeholder="Digite sua mensagem..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={sending}
                  rows={3}
                  style={{
                    flex: 1,
                    margin: 0,
                    resize: "none",
                    fontFamily: "inherit",
                    padding: "12px",
                  }}
                />
                <button
                  type="submit"
                  disabled={sending || !message.trim()}
                  style={{
                    margin: 0,
                    padding: "12px 20px",
                    background: "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: sending || !message.trim() ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    transition: "background 0.2s",
                    opacity: sending || !message.trim() ? 0.6 : 1,
                    height: "fit-content",
                  }}
                  onMouseEnter={(e) => {
                    if (!sending && message.trim()) {
                      e.currentTarget.style.background = "#0056b3";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#007bff";
                  }}
                >
                  {sending ? "..." : "Enviar"}
                </button>
              </form>
            </div>
          </div>
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
    </div>
  );
}
