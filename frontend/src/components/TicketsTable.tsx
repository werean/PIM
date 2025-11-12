import { useNavigate } from "react-router-dom";
import type { Ticket } from "../services/api";
import StatusBadge from "./StatusBadge";
import UrgencyBadge from "./UrgencyBadge";

interface TicketsTableProps {
  tickets: Array<Ticket & { _status: string; _date: string }>;
  loading: boolean;
  error?: string | null;
  message: string | null;
  sortField: "id" | "status" | "date" | "urgency" | null;
  sortOrder: "asc" | "desc" | "default";
  onSort: (field: "id" | "status" | "date" | "urgency") => void;
}

/**
 * Tabela de tickets com semântica HTML e BEM
 * Tabela responsiva e ordenável por colunas
 */
export default function TicketsTable({
  tickets,
  loading,
  error,
  message,
  sortField,
  sortOrder,
  onSort,
}: TicketsTableProps) {
  const navigate = useNavigate();

  const getSortIndicator = (field: string) => {
    if (sortField !== field) return "";
    if (sortOrder === "asc") return " ↑";
    if (sortOrder === "desc") return " ↓";
    return "";
  };

  return (
    <div className="tickets-table">
      <table className="tickets-table__table">
        <thead className="tickets-table__head">
          <tr className="tickets-table__head-row">
            <th
              onClick={() => onSort("id")}
              className={`tickets-table__head-cell tickets-table__head-cell--sortable ${
                sortField === "id" ? "tickets-table__head-cell--active" : ""
              }`}
            >
              ID{getSortIndicator("id")}
            </th>
            <th className="tickets-table__head-cell">TÍTULO</th>
            <th
              onClick={() => onSort("status")}
              className={`tickets-table__head-cell tickets-table__head-cell--sortable ${
                sortField === "status" ? "tickets-table__head-cell--active" : ""
              }`}
            >
              STATUS{getSortIndicator("status")}
            </th>
            <th
              onClick={() => onSort("date")}
              className={`tickets-table__head-cell tickets-table__head-cell--sortable ${
                sortField === "date" ? "tickets-table__head-cell--active" : ""
              }`}
            >
              DATA{getSortIndicator("date")}
            </th>
            <th
              onClick={() => onSort("urgency")}
              className={`tickets-table__head-cell tickets-table__head-cell--sortable ${
                sortField === "urgency"
                  ? "tickets-table__head-cell--active"
                  : ""
              }`}
            >
              URGÊNCIA{getSortIndicator("urgency")}
            </th>
          </tr>
        </thead>
        <tbody className="tickets-table__body">
          {loading && (
            <tr className="tickets-table__row">
              <td
                colSpan={5}
                className="tickets-table__cell tickets-table__cell--center"
              >
                Carregando...
              </td>
            </tr>
          )}
          {error && (
            <tr className="tickets-table__row">
              <td
                colSpan={5}
                className="tickets-table__cell tickets-table__cell--error tickets-table__cell--center"
              >
                {error}
              </td>
            </tr>
          )}
          {message && !loading && !error && (
            <tr className="tickets-table__row">
              <td
                colSpan={5}
                className="tickets-table__cell tickets-table__cell--center"
              >
                {message}
              </td>
            </tr>
          )}
          {!loading &&
            !error &&
            tickets.map((ticket, idx) => (
              <tr
                key={ticket.id ?? idx}
                onClick={() => ticket.id && navigate(`/ticket/${ticket.id}`)}
                className="tickets-table__row tickets-table__row--clickable"
              >
                <td className="tickets-table__cell tickets-table__cell--id">
                  #{ticket.id ?? "-"}
                </td>
                <td className="tickets-table__cell tickets-table__cell--title">
                  {ticket.title}
                </td>
                <td className="tickets-table__cell">
                  <StatusBadge status={ticket.status} />
                </td>
                <td className="tickets-table__cell tickets-table__cell--date">
                  {ticket._date}
                </td>
                <td className="tickets-table__cell">
                  <UrgencyBadge urgency={ticket.urgency || 1} />
                </td>
              </tr>
            ))}
          {!loading && !error && tickets.length === 0 && (
            <tr className="tickets-table__row">
              <td
                colSpan={5}
                className="tickets-table__cell tickets-table__cell--center"
              >
                Nenhum chamado encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
