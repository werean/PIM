import { knex } from "../../../config/database.config";
import { Ticket, TicketTable } from "../../interfaces";

// Service apenas encapsula as queries do knex, sem lógica adicional
export const ticketService = {
  findAll: (): Promise<Ticket[]> => knex(TicketTable).select(),

  findById: (id: number): Promise<Ticket | undefined> => knex(TicketTable).where({ id }).first(),

  insert: (ticket: Omit<Ticket, "id">): Promise<void> => knex(TicketTable).insert(ticket),

  delete: (id: number): Promise<number> => knex(TicketTable).where({ id }).del(),

  put: (id: number, data: Omit<Ticket, "id">): Promise<Ticket | undefined> =>
    knex(TicketTable).where({ id }).update(data),
};
