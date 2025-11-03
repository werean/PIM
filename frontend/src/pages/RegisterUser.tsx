import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

// API Request
import { apiPost } from "../services/api";
import type { CreateUserPayload, Role } from "../services/api";

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

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
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
      const res = await apiPost<{ message?: string }>("/user/create", form);
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
              placeholder="Senha de até 8 caracteres..."
              maxLength={8}
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
              <option value={15}>Admin</option>
            </select>
          </div>

          <button
            type="submit"
            className="register-form__submit"
            disabled={loading}
          >
            {loading ? "Criando..." : "Criar conta"}
          </button>

          {message && (
            <p className="register-form__message register-form__message--success">
              {message}
            </p>
          )}
          {error && (
            <p className="register-form__message register-form__message--error">
              {error}
            </p>
          )}

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
