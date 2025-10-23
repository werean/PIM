import styles from "../css/Tickets.module.css";

type AssistenteProps = {
  supportOpen: boolean;
};

export default function Assistente({ supportOpen }: AssistenteProps) {
  return (
    <section
      className={styles.supportSection}
      style={{ bottom: supportOpen ? "0px" : "-100px" }}
    >
      <h1 className={styles.supportTitle}>Assistente</h1>
      <input
        type="text"
        name="problem__input"
        id="problem__input"
        placeholder="Qual o seu problema?"
        className={styles.supportInput}
      />
    </section>
  );
}
