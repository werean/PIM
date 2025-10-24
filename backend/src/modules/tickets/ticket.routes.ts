import type { FastifyInstance } from "fastify";

import { ticketController } from "./ticket.controller";

//route register

export default async function registerRoutes(server: FastifyInstance) {
  server.register(ticketController, { prefix: "/ticket" });
}
