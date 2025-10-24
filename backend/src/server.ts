import fastify from "fastify";
import dotenv from "dotenv";
import { fastifyCookie } from "@fastify/cookie";
import websocketPlugin from "@fastify/websocket";
import { registerSwagger } from "./config/swagger";

import { env } from "./env";
import registerRoutes from "./routes/index";
import { verifyToken } from "./middleware/global.middleware";
import { authConfig } from "./modules/auth/auth.config";

dotenv.config();

const server = fastify();
server.register(websocketPlugin);

// 🔹 Swagger modularizado
registerSwagger(server);

const port = env.PORT;

server.register(fastifyCookie, {
  secret: authConfig.jwt.secret,
  hook: "onRequest",
});

server.addHook("onRequest", verifyToken);
server.register(registerRoutes);

server.listen(
  {
    port: Number(port),
  },
  (err, address) => {
    if (err) {
      server.log.error(err);
      process.exit(1);
    }
    console.log(`Servidor rodando: ${address}`);
    console.log(`Documentação Swagger: ${address}/docs`);
  }
);
