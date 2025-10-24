import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { authConfig } from "../modules/auth/auth.config";
import jwt from "jsonwebtoken";

export async function verifyToken(request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies[authConfig.cookie.name];
  const publicRoutes = ["/login", "/user/create", "/ws"];
  const urlPath = request.raw.url?.split("?")[0] || "";
  // Permite qualquer rota que comece com /docs
  if (publicRoutes.includes(urlPath) || urlPath.startsWith("/docs")) {
    return;
  }
  if (!token) {
    return reply.code(401).send({ message: "token vázio." }).redirect("/login");
  }
  try {
    jwt.verify(token, authConfig.jwt.secret);
  } catch (e) {
    reply.code(401).redirect("/login");
  }
}
