import { FastifyInstance } from "fastify";
import login from "./auth.controller";

export default async function authLoginRoutes(server: FastifyInstance) {
  server.register(login);
}
