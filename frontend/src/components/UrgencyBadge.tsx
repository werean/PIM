interface UrgencyBadgeProps {
  urgency: number;
  className?: string;
}

const URGENCY_MAP: Record<number, string> = {
  1: "Baixa",
  2: "Média",
  3: "Alta",
};

export default function UrgencyBadge({
  urgency,
  className = "",
}: UrgencyBadgeProps) {
  const urgencyText = URGENCY_MAP[urgency] || "Desconhecida";

  const getUrgencyClass = () => {
    const baseClass = "urgency-badge";
    const urgencyClass = `urgency-badge--${urgency}`;
    return `${baseClass} ${urgencyClass} ${className}`.trim();
  };

  return <span className={getUrgencyClass()}>{urgencyText}</span>;
}
