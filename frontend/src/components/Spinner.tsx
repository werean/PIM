interface SpinnerProps {
  size?: number;
  color?: string;
  className?: string;
}

// Adiciona o keyframe globalmente uma vez
const styleId = "spinner-keyframes";
if (typeof document !== "undefined" && !document.getElementById(styleId)) {
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    @keyframes spinner-rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

export default function Spinner({
  size = 16,
  color = "currentColor",
  className = "",
}: SpinnerProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        animation: "spinner-rotate 1s linear infinite",
        display: "block",
        flexShrink: 0,
      }}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="31.4 31.4"
      />
    </svg>
  );
}
