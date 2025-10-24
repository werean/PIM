import { z } from "zod";

export const ticketSchema = z
  .object({
    title: z.string().min(4, "Campo deve conter no mínimo 4 caracteres."),
    ticket_body: z
      .string()
      .min(10, "O corpo do ticket deve ter pelo menos 10 caracteres.")
      .max(5000, "O corpo do ticket não pode ultrapassar 5000 caracteres."),
    urgency: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  })
  .strict();

export type TicketDTO = z.infer<typeof ticketSchema>;
