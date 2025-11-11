import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

// API Request
import type { Ticket } from "../services/api";
import { apiGet, getCurrentUserName } from "../services/api";

// Utils
import { isAuthenticated, deleteCookie } from "../utils/cookies";

// Components
import Sidebar from "../components/Sidebar";
import UserBadge from "../components/UserBadge";

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

const STATUS_COLOR: Record<StatusKind, string> = {
  Aberto: "#2ab849",
  Pendente: "#f2a400",
  Resolvido: "#7e7e7e",
  Reaberto: "#ff6b6b",
  "Aguardando Aprovação": "#9e9e9e",
  "Aguardando Exclusão": "#ff9800",
  Deletado: "#616161",
};

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
    // O backend já retorna o horário de Brasília, apenas formata
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

export default function HomePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<StatusKind | "Total" | null>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("default");
  const statusFilter = "";
  const dateFilter = "";
  const navigate = useNavigate();

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
        const msg = err instanceof Error ? err.message : "Erro ao carregar tickets";
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
  }, []);

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
        const stOK = statusFilter ? t._status === statusFilter : true;
        const dtOK = dateFilter ? t._date === dateFilter : true;
        const catOK =
          categoryFilter && categoryFilter !== "Total" ? t._status === categoryFilter : true;
        return stOK && dtOK && catOK;
      }),
    [derived, statusFilter, dateFilter, categoryFilter]
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
        3: sortOrder === "asc" ? 1 : sortOrder === "desc" ? 2 : 3, // Alta
        2: sortOrder === "asc" ? 2 : sortOrder === "desc" ? 1 : 3, // Média
        1: sortOrder === "asc" ? 3 : sortOrder === "desc" ? 3 : 1, // Baixa
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
            / <strong style={{ color: "#212529" }}>Chamados</strong>
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

        <main style={{ padding: "24px", maxWidth: "100%", width: "100%" }}>
          <section style={{ maxWidth: "100%" }}>
            <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
              <div
                onClick={() => setCategoryFilter(categoryFilter === "Aberto" ? null : "Aberto")}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  background: categoryFilter === "Aberto" ? "#dcfce7" : "#f0fdf4",
                  border: categoryFilter === "Aberto" ? "2px solid #22c55e" : "1px solid #bbf7d0",
                  borderRadius: "4px",
                  fontSize: "13px",
                  fontWeight: categoryFilter === "Aberto" ? "600" : "500",
                  color: "#166534",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (categoryFilter !== "Aberto") {
                    e.currentTarget.style.background = "#dcfce7";
                  }
                }}
                onMouseLeave={(e) => {
                  if (categoryFilter !== "Aberto") {
                    e.currentTarget.style.background = "#f0fdf4";
                  }
                }}
              >
                {statusCounts.Aberto} Abertos
              </div>
              <div
                onClick={() => setCategoryFilter(categoryFilter === "Pendente" ? null : "Pendente")}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  background: categoryFilter === "Pendente" ? "#fef3c7" : "#fffbeb",
                  border: categoryFilter === "Pendente" ? "2px solid #eab308" : "1px solid #fde68a",
                  borderRadius: "4px",
                  fontSize: "13px",
                  fontWeight: categoryFilter === "Pendente" ? "600" : "500",
                  color: "#92400e",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (categoryFilter !== "Pendente") {
                    e.currentTarget.style.background = "#fef3c7";
                  }
                }}
                onMouseLeave={(e) => {
                  if (categoryFilter !== "Pendente") {
                    e.currentTarget.style.background = "#fffbeb";
                  }
                }}
              >
                {statusCounts.Pendente} Pendentes
              </div>
              <div
                onClick={() =>
                  setCategoryFilter(categoryFilter === "Resolvido" ? null : "Resolvido")
                }
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  background: categoryFilter === "Resolvido" ? "#e5e7eb" : "#f9fafb",
                  border:
                    categoryFilter === "Resolvido" ? "2px solid #6b7280" : "1px solid #e5e7eb",
                  borderRadius: "4px",
                  fontSize: "13px",
                  fontWeight: categoryFilter === "Resolvido" ? "600" : "500",
                  color: "#374151",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (categoryFilter !== "Resolvido") {
                    e.currentTarget.style.background = "#e5e7eb";
                  }
                }}
                onMouseLeave={(e) => {
                  if (categoryFilter !== "Resolvido") {
                    e.currentTarget.style.background = "#f9fafb";
                  }
                }}
              >
                {statusCounts.Resolvido} Resolvidos
              </div>
              <div
                onClick={() => setCategoryFilter(null)}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  background: categoryFilter === null ? "#dbeafe" : "#eff6ff",
                  border: categoryFilter === null ? "2px solid #3b82f6" : "1px solid #bfdbfe",
                  borderRadius: "4px",
                  fontSize: "13px",
                  fontWeight: categoryFilter === null ? "600" : "500",
                  color: "#1e40af",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (categoryFilter !== null) {
                    e.currentTarget.style.background = "#dbeafe";
                  }
                }}
                onMouseLeave={(e) => {
                  if (categoryFilter !== null) {
                    e.currentTarget.style.background = "#eff6ff";
                  }
                }}
              >
                {derived.length} Total
              </div>
            </div>

            <div
              role="table"
              aria-label="Tabela de Chamados"
              style={{
                background: "white",
                border: "1px solid #e9ecef",
                borderRadius: "4px",
                overflow: "hidden",
                width: "100%",
              }}
            >
              <table
                cellSpacing={0}
                style={{ width: "100%", borderCollapse: "collapse", tableLayout: "auto" }}
              >
                <thead style={{ background: "#f8f9fa", borderBottom: "1px solid #e9ecef" }}>
                  <tr>
                    <th
                      onClick={() => handleSort("id")}
                      style={{
                        padding: "10px 12px",
                        textAlign: "left",
                        fontSize: "11px",
                        fontWeight: "600",
                        color: sortField === "id" ? "#6c5ce7" : "#6c757d",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        cursor: "pointer",
                        userSelect: "none",
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#6c5ce7";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = sortField === "id" ? "#6c5ce7" : "#6c757d";
                      }}
                    >
                      ID{" "}
                      {sortField === "id" &&
                        (sortOrder === "asc" ? "↑" : sortOrder === "desc" ? "↓" : "")}
                    </th>
                    <th
                      style={{
                        padding: "10px 12px",
                        textAlign: "left",
                        fontSize: "11px",
                        fontWeight: "600",
                        color: "#6c757d",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      TÍTULO
                    </th>
                    <th
                      onClick={() => handleSort("status")}
                      style={{
                        padding: "10px 12px",
                        textAlign: "left",
                        fontSize: "11px",
                        fontWeight: "600",
                        color: sortField === "status" ? "#6c5ce7" : "#6c757d",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        cursor: "pointer",
                        userSelect: "none",
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#6c5ce7";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color =
                          sortField === "status" ? "#6c5ce7" : "#6c757d";
                      }}
                    >
                      STATUS{" "}
                      {sortField === "status" &&
                        (sortOrder === "asc" ? "↑" : sortOrder === "desc" ? "↓" : "")}
                    </th>
                    <th
                      onClick={() => handleSort("date")}
                      style={{
                        padding: "10px 12px",
                        textAlign: "left",
                        fontSize: "11px",
                        fontWeight: "600",
                        color: sortField === "date" ? "#6c5ce7" : "#6c757d",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        cursor: "pointer",
                        userSelect: "none",
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#6c5ce7";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = sortField === "date" ? "#6c5ce7" : "#6c757d";
                      }}
                    >
                      DATA{" "}
                      {sortField === "date" &&
                        (sortOrder === "asc" ? "↑" : sortOrder === "desc" ? "↓" : "")}
                    </th>
                    <th
                      onClick={() => handleSort("urgency")}
                      style={{
                        padding: "10px 12px",
                        textAlign: "left",
                        fontSize: "11px",
                        fontWeight: "600",
                        color: sortField === "urgency" ? "#6c5ce7" : "#6c757d",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        cursor: "pointer",
                        userSelect: "none",
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#6c5ce7";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color =
                          sortField === "urgency" ? "#6c5ce7" : "#6c757d";
                      }}
                    >
                      URGÊNCIA{" "}
                      {sortField === "urgency" &&
                        (sortOrder === "asc" ? "↑" : sortOrder === "desc" ? "↓" : "")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={5}>Carregando...</td>
                    </tr>
                  )}
                  {error && (
                    <tr>
                      <td colSpan={5} className="form__message form__message--error">
                        {error}
                      </td>
                    </tr>
                  )}
                  {message && !loading && !error && (
                    <tr>
                      <td colSpan={5}>{message}</td>
                    </tr>
                  )}
                  {!loading &&
                    !error &&
                    sorted.map((t, idx) => (
                      <tr
                        key={t.id ?? idx}
                        onClick={() => t.id && navigate(`/ticket/${t.id}`)}
                        style={{ cursor: "pointer", borderBottom: "1px solid #f1f3f5" }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8f9fa")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
                      >
                        <td style={{ padding: "10px 12px", fontSize: "13px", color: "#495057" }}>
                          #{t.id ?? "-"}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            fontSize: "13px",
                            fontWeight: "500",
                            color: "#212529",
                          }}
                        >
                          {t.title}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span
                            style={{
                              padding: "3px 8px",
                              borderRadius: "3px",
                              fontSize: "10px",
                              fontWeight: "500",
                              color: STATUS_COLOR[t._status],
                              backgroundColor:
                                t._status === "Resolvido"
                                  ? "#d1d5db"
                                  : `${STATUS_COLOR[t._status]}15`,
                              border: `1px solid ${STATUS_COLOR[t._status]}40`,
                            }}
                          >
                            {t._status}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: "12px", color: "#6c757d" }}>
                          {t._date}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 8px",
                              borderRadius: "3px",
                              fontSize: "10px",
                              fontWeight: "500",
                              color:
                                t.urgency === 3
                                  ? "#dc3545"
                                  : t.urgency === 2
                                  ? "#f59e0b"
                                  : "#28a745",
                              backgroundColor:
                                t.urgency === 3
                                  ? "#dc354515"
                                  : t.urgency === 2
                                  ? "#f59e0b15"
                                  : "#28a74515",
                              border:
                                t.urgency === 3
                                  ? "1px solid #dc354540"
                                  : t.urgency === 2
                                  ? "1px solid #f59e0b40"
                                  : "1px solid #28a74540",
                            }}
                          >
                            {t.urgency === 3 ? "Alta" : t.urgency === 2 ? "Média" : "Baixa"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  {!loading && !error && filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "20px" }}>
                        Nenhum chamado encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
