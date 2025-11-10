import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

// API Request
import type { CreateUserPayload, Role } from "../services/api";
import { apiPost } from "../services/api";

// Utils
import { isAuthenticated } from "../utils/cookies";

// Imagens
import logoLJFT from "../assets/images/logoLJFT.png";

export default function RegisterUserPage() {
  const [form, setForm] = useState<CreateUserPayload>({
    username: "",
    email: "",
    password: "",
    role: 5,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Se já estiver autenticado, mostrar link para voltar à home
  const authenticated = isAuthenticated();

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "role" ? (Number(value) as Role) : value,
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await apiPost<{ message?: string }>("/users", form);
      setMessage(res.message ?? "Usuário criado com sucesso.");
      setForm({ username: "", email: "", password: "", role: 5 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao criar usuário";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="register-page">
      <div className="register-page__card">
        <img src={logoLJFT} alt="Logo LJFT" className="register-page__logo" />
        {authenticated && (
          <div
            style={{
              background: "#d1ecf1",
              border: "1px solid #bee5eb",
              color: "#0c5460",
              padding: "10px 15px",
              borderRadius: "4px",
              marginBottom: "15px",
              textAlign: "center",
            }}
          >
            Você já está autenticado.{" "}
            <Link to="/home" style={{ color: "#0c5460", fontWeight: "bold" }}>
              Ir para Home
            </Link>
          </div>
        )}
        <form onSubmit={handleSubmit} className="register-form">
          <h2 className="register-form__title">Crie sua conta</h2>

          <div className="register-form__group">
            <label htmlFor="reg-username" className="register-form__label">
              Nome de usuário
            </label>
            <input
              id="reg-username"
              className="register-form__input"
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              placeholder="Seu nome de usuário..."
              required
            />
          </div>

          <div className="register-form__group">
            <label htmlFor="reg-email" className="register-form__label">
              E-mail
            </label>
            <input
              id="reg-email"
              className="register-form__input"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="seuemail@empresa.com"
              required
            />
          </div>

          <div className="register-form__group">
            <label htmlFor="reg-password" className="register-form__label">
              Senha
            </label>
            <input
              id="reg-password"
              className="register-form__input"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Senha (mín. 8 chars, maiúscula, minúscula, número, especial)"
              required
            />
          </div>

          <div className="register-form__group">
            <label htmlFor="reg-role" className="register-form__label">
              Perfil
            </label>
            <select
              id="reg-role"
              className="register-form__select"
              name="role"
              value={form.role}
              onChange={handleChange}
            >
              <option value={5}>Usuário</option>
              <option value={10}>Técnico</option>
            </select>
          </div>

          <button type="submit" className="register-form__submit" disabled={loading}>
            {loading ? "Criando..." : "Criar conta"}
          </button>

          {message && (
            <p className="register-form__message register-form__message--success">{message}</p>
          )}
          {error && <p className="register-form__message register-form__message--error">{error}</p>}

          <p className="register-form__footer">
            Já tem uma conta?{" "}
            <Link to="/login" className="register-form__link">
              Fazer login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
