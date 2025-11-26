import { useUserProfile } from "../contexts/UserProfileContext";
import { getCurrentUserName } from "../services/api";

interface UserBadgeProps {
  size?: number;
  fontSize?: number;
  onClick?: () => void;
  clickable?: boolean;
}

export default function UserBadge({
  size = 28,
  fontSize = 11,
  onClick,
  clickable = false,
}: UserBadgeProps) {
  const { profile, isLoading } = useUserProfile();
  const userName = profile?.username || getCurrentUserName();
  const profileImage = profile?.profileImage;

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  // Se estiver carregando, mostra um placeholder
  if (isLoading) {
    return (
      <span
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: "50%",
          background: "#e3f2fd",
          border: "1px solid #90caf9",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      />
    );
  }

  // Se tem imagem de perfil, mostra a imagem
  if (profileImage) {
    return (
      <img
        src={profileImage}
        alt={userName}
        onClick={onClick}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: "50%",
          objectFit: "cover",
          border: "1px solid #90caf9",
          cursor: clickable ? "pointer" : "default",
          transition: "opacity 0.15s",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          if (clickable) {
            e.currentTarget.style.opacity = "0.7";
          }
        }}
        onMouseLeave={(e) => {
          if (clickable) {
            e.currentTarget.style.opacity = "1";
          }
        }}
      />
    );
  }

  // Fallback para iniciais
  return (
    <span
      onClick={onClick}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        background: "#e3f2fd",
        border: "1px solid #90caf9",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: `${fontSize}px`,
        fontWeight: "600",
        color: "#1976d2",
        cursor: clickable ? "pointer" : "default",
        transition: "opacity 0.15s",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (clickable) {
          e.currentTarget.style.opacity = "0.7";
        }
      }}
      onMouseLeave={(e) => {
        if (clickable) {
          e.currentTarget.style.opacity = "1";
        }
      }}
    >
      {initials}
    </span>
  );
}
