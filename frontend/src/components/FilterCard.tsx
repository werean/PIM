interface FilterCardProps {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
  variant: "open" | "pending" | "resolved" | "total";
}

/**
 * Card de filtro seguindo metodologia BEM
 * Componente reutilizável para filtros de status
 * Usa variáveis CSS para cores e espaçamento
 */
export default function FilterCard({
  label,
  count,
  isActive,
  onClick,
  variant,
}: FilterCardProps) {
  const getClassName = () => {
    const baseClass = "filter-card";
    const variantClass = `filter-card--${variant}`;
    const activeClass = isActive ? "filter-card--active" : "";
    return `${baseClass} ${variantClass} ${activeClass}`.trim();
  };

  return (
    <button type="button" onClick={onClick} className={getClassName()}>
      {count} {label}
    </button>
  );
}
