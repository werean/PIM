import styles from "../css/Tickets.module.css";

type TicketProps = {
  setSupportOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function Ticket({ setSupportOpen }: TicketProps) {
  return (
    <tr className={styles.cardRow}>
      <td className={styles.cardInfo}>
        <a
          onClick={() => {
            setSupportOpen(!false);
          }}
        >
          Titulo do ticket
        </a>
      </td>
      <td className={styles.cardInfo}>Em andamento</td>
      <td className={styles.cardInfo}>01/01/2004</td>
      <td className={styles.cardInfo}>Urgente</td>
    </tr>
  );
}
