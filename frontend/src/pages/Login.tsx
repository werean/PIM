import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

// API
import { apiPost } from "../services/api";

// Utils
import { setCookie, isAuthenticated } from "../utils/cookies";

// Components
import { ErrorMessage, FieldError } from "../components/ErrorMessage";

// Imagens
import logoLJFT from "../assets/images/logoLJFT.png";

export default function LoginPage() {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrar, setLembrar] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Redireciona para /home se já estiver autenticado
  useEffect(() => {
    if (isAuthenticated()) {
      navigate("/home");
    }
  }, [navigate]);

  // Validação de email
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validação do formulário
  const validateForm = (): boolean => {
    const newFieldErrors: { email?: string; password?: string } = {};
    let isValid = true;

    if (!usuario.trim()) {
      newFieldErrors.email = "Email é obrigatório";
      isValid = false;
    } else if (!validateEmail(usuario)) {
      newFieldErrors.email = "Email inválido";
      isValid = false;
    }

    if (!senha) {
      newFieldErrors.password = "Senha é obrigatória";
      isValid = false;
    } else if (senha.length < 6) {
      newFieldErrors.password = "Senha deve ter no mínimo 6 caracteres";
      isValid = false;
    }

    setFieldErrors(newFieldErrors);
    return isValid;
  };

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setErrors([]);
    setFieldErrors({});

    // Validação do formulário
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiPost<{
        success?: boolean;
        message?: string;
        token?: string;
        user?: { id: string; username: string; email: string; role: number };
      }>("/auth/login", {
        email: usuario,
        password: senha,
      });

      // Salvar token nos cookies por 7 dias
      if (response.token) {
        setCookie("token", response.token, 7);
      }

      // Salvar informações do usuário nos cookies
      if (response.user) {
        setCookie("user", JSON.stringify(response.user), 7);
      }

      if (lembrar) {
        localStorage.setItem("usuario", usuario);
      } else {
        localStorage.removeItem("usuario");
      }

      // After successful login, navigate to the home page
      navigate("/home");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; errors?: string[] } }; message?: string };
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
      setError(
        error.response?.data?.message ||
          error.message ||
          "Erro ao efetuar login"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-page__card">
        <img src={logoLJFT} alt="Logo LIFT" className="login-page__logo" />
        <form onSubmit={handleLogin} className="login-form">
          <h2 className="login-form__title">Faça login na sua conta</h2>

          {(error || errors.length > 0) && (
            <ErrorMessage message={error || undefined} errors={errors} />
          )}

          <div className="login-form__group">
            <label htmlFor="usuario" className="login-form__label">
              Usuário
            </label>
            <input
              id="usuario"
              type="email"
              className="login-form__input"
              placeholder="Digite seu e-mail..."
              value={usuario}
              onChange={(e) => {
                setUsuario(e.target.value);
                if (fieldErrors.email) {
                  setFieldErrors({ ...fieldErrors, email: undefined });
                }
              }}
              required
            />
            <FieldError error={fieldErrors.email} />
          </div>

          <div className="login-form__group">
            <label htmlFor="senha" className="login-form__label">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              className="login-form__input"
              placeholder="Digite sua senha..."
              value={senha}
              onChange={(e) => {
                setSenha(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors({ ...fieldErrors, password: undefined });
                }
              }}
              required
            />
            <FieldError error={fieldErrors.password} />
          </div>

          <div className="login-form__checkbox">
            <input
              id="lembrar"
              type="checkbox"
              checked={lembrar}
              onChange={() => setLembrar(!lembrar)}
            />
            <label htmlFor="lembrar">Lembrar de mim</label>
          </div>

          <button 
            type="submit" 
            className="login-form__submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>

          <p className="login-form__footer">
            Não tem uma conta?{" "}
            <Link to="/register" className="login-form__link">
              Criar uma conta
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
