export default function LoginPage() {
  return (
    <main className="login">
      <section className="login__container" aria-labelledby="login-title">
        <h1 id="login-title" className="login__title">Ticket AI</h1>
        <div className="login__form-container">
          <form className="form" aria-label="Formulário de Login">
            <div className="form__group">
              <label className="form__label" htmlFor="login-email">E-mail</label>
              <input id="login-email" className="form__input" type="email" placeholder="seuemail@empresa.com" />
            </div>
            <div className="form__group">
              <label className="form__label" htmlFor="login-password">Senha</label>
              <input id="login-password" className="form__input" type="password" placeholder="Senha" />
            </div>
            <div className="form__actions">
              <button type="submit">Entrar</button>
            </div>
          </form>
          <nav className="login__links" aria-label="Links de ajuda">
            <a className="login__link" href="#">Esqueceu a senha?</a>
            <a className="login__link" href="/register">Criar conta</a>
          </nav>
        </div>
      </section>
    </main>
  );
}
