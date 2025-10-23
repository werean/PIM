import { FaEye } from "react-icons/fa6";
//  FaEyeSlash

import styles from "../css/Login.module.css";

export default function LoginPage() {
  return (
    <>
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <h1>Ticket AI</h1>

          <div className={styles.formContainer}>
            <form>
              <input type="email" placeholder="email" />
              <label htmlFor="password">
                <input type="password" placeholder="password" maxLength={8} />
                <FaEye />
              </label>
              <button type="submit">Entrar</button>
            </form>
            <a href="http://">Esqueceu a senha?</a>
            <a href="http://">Criar conta</a>
          </div>
        </div>
      </div>
    </>
  );
}
