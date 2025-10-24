type Urgency = 1 | 2 | 3;

export interface Ticket {
  readonly id?: string;
  title: string;
  ticket_body: string;
  urgency: Urgency;
}

export const TicketTable = "tickets" as const;
