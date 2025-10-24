import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import { env } from "../env";
import { FastifyInstance } from "fastify";

export async function registerSwagger(server: FastifyInstance) {
  server.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "API do Sistema de Tickets",
        description: "Documentação gerada automaticamente com Swagger",
        version: "1.0.0",
      },
      servers: [
        {
          url: `http://localhost:${env.PORT}`,
        },
      ],
    },
  });

  server.register(swaggerUI, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
    staticCSP: true,
    transformSpecification: (swaggerObject, request, reply) => swaggerObject,
    transformSpecificationClone: true,
  });
}
