import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

// API Request
import type { CreateUserPayload, Role } from "../services/api";
import { apiPost } from "../services/api";

// Utils
import { isAuthenticated } from "../utils/cookies";

// Components
import { ErrorMessage, FieldError } from "../components/ErrorMessage";

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
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
  }>({});
  const [showPassword, setShowPassword] = useState(false);

  // Se já estiver autenticado, mostrar link para voltar à home
  const authenticated = isAuthenticated();

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "role" ? (Number(value) as Role) : value,
    }));
    // Limpar erro do campo ao digitar
    if (fieldErrors[name as keyof typeof fieldErrors]) {
      setFieldErrors({ ...fieldErrors, [name]: undefined });
    }
  }

  // Validação de email
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validação do formulário
  const validateForm = (): boolean => {
    const newFieldErrors: {
      username?: string;
      email?: string;
      password?: string;
    } = {};
    let isValid = true;

    // Validar username
    if (!form.username.trim()) {
      newFieldErrors.username = "Nome de usuário é obrigatório";
      isValid = false;
    } else if (form.username.length < 3) {
      newFieldErrors.username = "Nome de usuário deve ter no mínimo 3 caracteres";
      isValid = false;
    } else if (form.username.length > 100) {
      newFieldErrors.username = "Nome de usuário deve ter no máximo 100 caracteres";
      isValid = false;
    }

    // Validar email
    if (!form.email.trim()) {
      newFieldErrors.email = "Email é obrigatório";
      isValid = false;
    } else if (!validateEmail(form.email)) {
      newFieldErrors.email = "Email inválido";
      isValid = false;
    }

    // Validar senha
    if (!form.password) {
      newFieldErrors.password = "Senha é obrigatória";
      isValid = false;
    } else if (form.password.length < 6) {
      newFieldErrors.password = "Senha deve ter no mínimo 6 caracteres";
      isValid = false;
    }

    setFieldErrors(newFieldErrors);
    return isValid;
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setErrors([]);
    setFieldErrors({});

    // Validação do formulário
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const res = await apiPost<{ message?: string }>("/users", form);
      setMessage(res.message ?? "Usuário criado com sucesso.");
      setForm({ username: "", email: "", password: "", role: 5 });
    } catch (err: unknown) {
      const error = err as {
        response?: {
          data?: {
            message?: string;
            errors?: string[];
            field?: string;
          };
        };
        message?: string;
      };

      // Se o backend retornou qual campo teve erro, mostrar no campo específico
      if (error.response?.data?.field) {
        const field = error.response.data.field;
        const message = error.response.data.message || "Campo inválido";

        if (field === "email") {
          setFieldErrors({ email: message });
        } else if (field === "username") {
          setFieldErrors({ username: message });
        } else if (field === "password") {
          setFieldErrors({ password: message });
        }
      } else if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        setError(error.response?.data?.message || error.message || "Erro ao criar usuário");
      }
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

          {message && (
            <div
              style={{
                backgroundColor: "#d4edda",
                border: "1px solid #c3e6cb",
                borderRadius: "4px",
                padding: "12px",
                marginBottom: "16px",
                color: "#155724",
              }}
            >
              {message}
            </div>
          )}

          {(error || errors.length > 0) && (
            <ErrorMessage message={error || undefined} errors={errors} />
          )}

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
            <FieldError error={fieldErrors.username} />
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
            <FieldError error={fieldErrors.email} />
          </div>

          <div className="register-form__group">
            <label htmlFor="reg-password" className="register-form__label">
              Senha
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="reg-password"
                className="register-form__input"
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                placeholder="Senha (mín. 6 caracteres)"
                required
                style={{ paddingRight: "40px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 8px",
                  color: "#6c757d",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
            <FieldError error={fieldErrors.password} />
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
