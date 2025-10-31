import type { Ticket } from "../services/api";

interface TicketCardProps {
  ticket: Ticket;
}

export function TicketCard({ ticket }: TicketCardProps) {
  return (
    <li className="ticket-card">
      <h3 className="ticket-card__title">{ticket.title}</h3>
      <p className="ticket-card__meta">Urgência: {ticket.urgency}</p>
      <p className="ticket-card__body">{ticket.ticket_body}</p>
    </li>
  );
}
