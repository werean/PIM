interface StatusBadgeProps {
  status: number;
  className?: string;
}

const STATUS_MAP: Record<number, string> = {
  1: "Aberto",
  2: "Pendente",
  3: "Resolvido",
  4: "Reaberto",
  5: "Aguardando Aprovação",
  6: "Aguardando Exclusão",
  7: "Deletado",
};

export default function StatusBadge({
  status,
  className = "",
}: StatusBadgeProps) {
  const statusText = STATUS_MAP[status] || "Desconhecido";

  // Use CSS variables and CSS classes for styling
  const getStatusClass = () => {
    const baseClass = "status-badge";
    const statusClass = `status-badge--${status}`;
    return `${baseClass} ${statusClass} ${className}`.trim();
  };

  return <span className={getStatusClass()}>{statusText}</span>;
}
