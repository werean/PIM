import { useState } from "react";

import Ticket from "../components/Ticket";
import Assistente from "../components/Assistente";

import styles from "../css/Tickets.module.css";

export default function Tickets() {
  const [ supportOpen, setSupportOpen ] = useState(false);

  return (
    <>
      <h1>Lista de Tickets</h1>

      <table className={styles.listContainer}>
        <thead className={styles.cardRow}>
          <td className={styles.cardTitle}>Titulo</td>
          <td className={styles.cardTitle}>Status</td>
          <td className={styles.cardTitle}>Data de abertura</td>
          <td className={styles.cardTitle}>Urgência</td>
        </thead>
        <tbody className={styles.listBody}>
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
          <Ticket setSupportOpen={setSupportOpen} />
        </tbody>
      </table>
      <Assistente supportOpen={supportOpen} />
    </>
  );
}
