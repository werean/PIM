import { useState, type ChangeEvent, type FormEvent } from "react";
import { apiPost } from "../services/api";
import type { CreateUserPayload, Role } from "../services/api";

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

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev: CreateUserPayload) => ({
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
    <main className="page page--register">
      <h2 className="page__title">Registrar Usuário / Admin</h2>
      <form onSubmit={handleSubmit} className="form" aria-label="Formulário de Registro">
        <div className="form__group">
          <label className="form__label" htmlFor="reg-username">Username</label>
          <input
            id="reg-username"
            className="form__input"
            name="username"
            type="text"
            value={form.username}
            onChange={handleChange}
            placeholder="Seu nome"
            required
          />
        </div>
        <div className="form__group">
          <label className="form__label" htmlFor="reg-email">E-mail</label>
          <input
            id="reg-email"
            className="form__input"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="seuemail@empresa.com"
            required
          />
        </div>
        <div className="form__group">
          <label className="form__label" htmlFor="reg-password">Senha</label>
          <input
            id="reg-password"
            className="form__input"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Senha forte"
            required
          />
        </div>
        <div className="form__group">
          <label className="form__label" htmlFor="reg-role">Perfil (role)</label>
          <select id="reg-role" className="form__select" name="role" value={form.role} onChange={handleChange}>
            <option value={5}>Usuário (5)</option>
            <option value={10}>Técnico (10)</option>
            <option value={15}>Admin (15)</option>
          </select>
        </div>
        <div className="form__actions">
          <button type="submit" disabled={loading}>
            {loading ? "Enviando..." : "Registrar"}
          </button>
        </div>
      </form>
      {message && <p className="form__message form__message--success">{message}</p>}
      {error && <p className="form__message form__message--error">{error}</p>}
    </main>
  );
}
