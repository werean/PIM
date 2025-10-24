import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { LoginDTO, loginSchema } from "./dto/auth.dto";
import jwt from "jsonwebtoken";
import { userService } from "../users/user.service";
import bcrypt from "bcrypt";
import { authConfig } from "./auth.config";
import { success } from "zod";

export default async function authLogin(server: FastifyInstance) {
  server.post(
    "/login",
    async (request: FastifyRequest<{ Body: LoginDTO }>, reply: FastifyReply) => {
      const loginBody = loginSchema.safeParse(request.body);

      if (!loginBody.success) {
        return reply.code(400).send({ message: "Informe o e-mail e senha" });
      }

      const { email, password } = loginBody.data;
      try {
        const user = await userService.findByEmail(email);
        const verifiedPassword = await bcrypt.compare(password, user.password);
        if (!user || !verifiedPassword) {
          return reply.code(404).send({
            success: false,
            message: "Usuário não encontrado.",
          });
        }

        const token = jwt.sign({ sub: user.id }, authConfig.jwt.secret, {
          expiresIn: authConfig.jwt.expiresIn,
        });
        reply.setCookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "strict",
          path: "/",
          maxAge: 3600 * 24 * 7, //1 week
        });
        return reply.code(201).send({
          success: true,
          message: "Login realizado com sucesso!",
        });
      } catch (e) {
        console.log(e);
        return reply.code(500).send({ message: "Erro interno" });
      }
    }
  );
  server.post("/logout", (request: FastifyRequest, reply: FastifyReply) => {
    reply.clearCookie("token", {
      httpOnly: true,
      path: "/",
      secure: true,
      sameSite: "strict",
    });
    return reply.code(201).send({ success: true, message: "Deslogado" }).redirect("/login");
  });
}
