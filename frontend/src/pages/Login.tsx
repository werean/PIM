import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import logoLJFT from "../assets/images/logoLJFT.png";

export default function LoginPage() {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrar, setLembrar] = useState(true);

  function handleLogin(e: FormEvent) {
    e.preventDefault();
    alert(`Usuário: ${usuario}\nSenha: ${senha}\nLembrar de mim: ${lembrar}`);
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
              type="text"
              className="login-form__input"
              placeholder="Celular, e-mail ou nome de usuário..."
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              required
            />
          </div>

          <div className="login-form__group">
            <div className="login-form__label-row">
              <label htmlFor="senha" className="login-form__label">
                Senha
              </label>
              <Link to="#" className="login-form__link">
                Esqueceu sua senha?
              </Link>
            </div>
            <input
              id="senha"
              type="password"
              className="login-form__input"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
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
