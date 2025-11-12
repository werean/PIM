import { useEffect } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const iconMap = {
    success: "✓",
    error: "✕",
    info: "i",
    warning: "⚠",
  };

  const colorMap = {
    success: {
      bg: "#d4edda",
      border: "#28a745",
      iconBg: "#28a745",
    },
    error: {
      bg: "#f8d7da",
      border: "#dc3545",
      iconBg: "#dc3545",
    },
    info: {
      bg: "#d1ecf1",
      border: "#17a2b8",
      iconBg: "#17a2b8",
    },
    warning: {
      bg: "#fff3cd",
      border: "#ffc107",
      iconBg: "#ffc107",
    },
  };

  const colors = colorMap[type];

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 16px",
        borderRadius: "6px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        minWidth: "280px",
        maxWidth: "450px",
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        animation: "slideInRight 0.3s ease-out forwards",
      }}
    >
      <div
        style={{
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px",
          fontWeight: "600",
          color: "#fff",
          background: colors.iconBg,
          flexShrink: 0,
        }}
      >
        {iconMap[type]}
      </div>
      <div
        style={{
          flex: 1,
          fontSize: "14px",
          fontWeight: "500",
          lineHeight: "1.4",
          color: "#212529",
        }}
      >
        {message}
      </div>
      <button
        onClick={onClose}
        style={{
          background: "transparent",
          border: "none",
          color: "#6c757d",
          fontSize: "20px",
          cursor: "pointer",
          padding: 0,
          width: "18px",
          height: "18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#212529";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#6c757d";
        }}
        aria-label="Fechar notificação"
      >
        ×
      </button>
    </div>
  );
}
