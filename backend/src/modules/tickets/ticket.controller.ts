import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ticketSchema, TicketDTO } from "./dto/create-ticket.dto";
import { ticketService } from "./ticket.service";
import { Ticket } from "../../interfaces";
import { title } from "process";

export async function ticketController(server: FastifyInstance) {
  server.get("/", async (req, res) => {
    const tickets = await ticketService.findAll();
    if (tickets.length === 0) {
      return res.status(200).send({
        message: "Ainda não possui tickets cadastrados.",
      });
    }

    return res.status(200).send({ tickets });
  });

  server.post("/", async (req, res) => {
    const { title, ticket_body, urgency } = ticketSchema.parse(req.body);

    const newTicket: Ticket = { ticket_body, title, urgency };
    await ticketService.insert(newTicket);
    return res.status(201).send({ message: "Ticket criado com sucesso!", ticket: newTicket });
  });

  server.delete<{ Params: { id: string } }>("/:id", async (req, res) => {
    const id = Number(req.params);
    const ticket = await ticketService.findById(id);

    if (!ticket) {
      return res.status(404).send({ message: "Ticket não encontrado." });
    }

    await ticketService.delete(id);
    return res.status(200).send({
      message: "Ticket deletado.",
      ticket,
    });
  });

  server.put<{ Params: { id: number } }>("/edit/:id", async (req, res) => {
    const id = Number(req.params.id);
    const ticket = await ticketService.findById(id);
    if (!ticket) {
      return res.status(404).send({ message: "Ticket não encontrado." });
    }
    const { title, ticket_body, urgency } = ticketSchema.parse(req.body);
    const updatedTicket: Ticket = { title, ticket_body, urgency };
    await ticketService.put(id, updatedTicket);
    return res.status(201).send({ message: "Ticket editado com sucesso!", ticket: updatedTicket });
  });
}
