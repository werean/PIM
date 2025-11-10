import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

// API
import { apiPost } from "../services/api";

// Imagens
import logoLJFT from "../assets/images/logoLJFT.png";

export default function LoginPage() {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrar, setLembrar] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
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

      // Salvar token no localStorage
      if (response.token) {
        localStorage.setItem("token", response.token);
      }

      // Salvar informações do usuário
      if (response.user) {
        localStorage.setItem("user", JSON.stringify(response.user));
      }

      if (lembrar) {
        localStorage.setItem("usuario", usuario);
      } else {
        localStorage.removeItem("usuario");
      }

      // After successful login, navigate to the home page
      navigate("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao efetuar login");
    }
  }

  return (
    <div className="login-page">
      <div className="login-page__card">
        <img src={logoLJFT} alt="Logo LIFT" className="login-page__logo" />
        <form onSubmit={handleLogin} className="login-form">
          <h2 className="login-form__title">Faça login na sua conta</h2>

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
              onChange={(e) => setUsuario(e.target.value)}
              required
            />
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
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>

          {error && <p className="login-form__error">{error}</p>}

          <div className="login-form__checkbox">
            <input
              id="lembrar"
              type="checkbox"
              checked={lembrar}
              onChange={() => setLembrar(!lembrar)}
            />
            <label htmlFor="lembrar">Lembrar de mim</label>
          </div>

          <button type="submit" className="login-form__submit">
            Entrar
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
