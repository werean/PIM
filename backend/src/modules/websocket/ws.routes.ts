import { FastifyInstance } from "fastify";
export default async function wsRoutes(server: FastifyInstance) {
  server.get("/ws", { websocket: true }, async (connection, req) => {
    connection.on("message", async (msg: any) => {
      const message = msg.toString();

      try {
        if (!process.env.OLLAMA_SERVER) {
          return console.log("Configure a process.env.OLLAMA_SERVER");
        }
        const response = await fetch(process.env.OLLAMA_SERVER, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "qwen3:0.6b",
            prompt: message,
            stream: true,
          }),
        });
        if (!response.body) {
          connection.send("Nenhum corpo de resposta recebido do Ollama");
          return;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((l) => l.trim() !== "");
          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.response) {
                connection.send(data.response);
              }
              if (data.done) {
                connection.send("[FIM]");
              }
            } catch {}
          }
        }
      } catch (err) {
        console.error("Erro ao conectar ao Ollama:", err);
        connection.send("Erro ao conectar ao Ollama");
      }
    });
    connection.on("close", () => {});
  });
}
