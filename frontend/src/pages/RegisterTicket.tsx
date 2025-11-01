import { useEffect, useRef, useState, type FormEvent } from "react";
import logoLJFT from "../assets/images/logoLJFT.png";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

export default function RegisterTicketPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      content:
        "Olá! Sou o assistente de abertura de chamados. Como posso ajudá-lo hoje? Descreva o problema que está enfrentando.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: messages.length + 1,
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // Simula resposta da IA (depois você conecta com backend real)
    setTimeout(() => {
      const aiResponse: Message = {
        id: messages.length + 2,
        role: "assistant",
        content:
          "Entendi seu problema. Vou criar um chamado para você. Por favor, confirme os detalhes:\n\n• Título: " +
          userMessage.content.substring(0, 50) +
          "\n• Urgência: Média\n\nPosso prosseguir com a criação do chamado?",
      };
      setMessages((prev) => [...prev, aiResponse]);
      setLoading(false);
    }, 1000);
  }

  return (
    <div className="chat-page">
      <header className="chat-page__header">
        <img src={logoLJFT} alt="Logo LIFT" className="chat-page__logo" />
        <h1 className="chat-page__title">Assistente de Chamados</h1>
      </header>

      <main className="chat-page__main">
        <div className="chat-messages">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-message chat-message--${msg.role}`}
            >
              <div className="chat-message__avatar">
                {msg.role === "assistant" ? "🤖" : "👤"}
              </div>
              <div className="chat-message__content">
                <div className="chat-message__role">
                  {msg.role === "assistant" ? "Assistente" : "Você"}
                </div>
                <div className="chat-message__text">{msg.content}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="chat-message chat-message--assistant">
              <div className="chat-message__avatar">🤖</div>
              <div className="chat-message__content">
                <div className="chat-message__role">Assistente</div>
                <div className="chat-message__text chat-message__text--loading">
                  <span className="chat-loader"></span>
                  <span className="chat-loader"></span>
                  <span className="chat-loader"></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="chat-page__footer">
        <form onSubmit={handleSubmit} className="chat-input-form">
          <input
            type="text"
            className="chat-input-form__input"
            placeholder="Descreva seu problema aqui..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            className="chat-input-form__submit"
            disabled={loading || !input.trim()}
          >
            Enviar
          </button>
        </form>
      </footer>
    </div>
  );
}
