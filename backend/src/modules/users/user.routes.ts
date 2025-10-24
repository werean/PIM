import type { FastifyInstance } from "fastify";
import { userController } from "./user.controller";

//route register

export default async function registerRoutes(server: FastifyInstance) {
  server.register(userController, { prefix: "/user" });
}
