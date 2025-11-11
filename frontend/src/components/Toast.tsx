import { useEffect } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const colors = {
    success: {
      bg: "#f0fdf4",
      border: "#22c55e",
      icon: "✓",
      iconBg: "#22c55e",
    },
    error: {
      bg: "#fef2f2",
      border: "#ef4444",
      icon: "✕",
      iconBg: "#ef4444",
    },
    info: {
      bg: "#eff6ff",
      border: "#3b82f6",
      icon: "i",
      iconBg: "#3b82f6",
    },
    warning: {
      bg: "#fffbeb",
      border: "#f59e0b",
      icon: "⚠",
      iconBg: "#f59e0b",
    },
  };

  const style = colors[type];

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        background: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: "4px",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        zIndex: 9999,
        minWidth: "280px",
        maxWidth: "450px",
        animation: "slideIn 0.3s ease-out",
      }}
    >
      <div
        style={{
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          background: style.iconBg,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px",
          fontWeight: "600",
          flexShrink: 0,
        }}
      >
        {style.icon}
      </div>
      <div
        style={{
          flex: 1,
          fontSize: "13px",
          color: "#374151",
          fontWeight: "500",
          lineHeight: "1.4",
        }}
      >
        {message}
      </div>
      <button
        onClick={onClose}
        style={{
          background: "transparent",
          border: "none",
          color: "#9ca3af",
          fontSize: "16px",
          cursor: "pointer",
          padding: "0",
          width: "18px",
          height: "18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#374151";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#9ca3af";
        }}
      >
        ×
      </button>
      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(400px);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
}
