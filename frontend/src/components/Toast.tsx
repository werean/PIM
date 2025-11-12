import { useEffect } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export default function Toast({
  message,
  type,
  onClose,
  duration = 5000,
}: ToastProps) {
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

  return (
    <div className={`toast toast--${type}`}>
      <div className="toast__icon">{iconMap[type]}</div>
      <div className="toast__message">{message}</div>
      <button
        onClick={onClose}
        className="toast__close"
        aria-label="Fechar notificação"
      >
        ×
      </button>
    </div>
  );
}
