import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PasswordInput from "../components/PasswordInput";
import Sidebar from "../components/Sidebar";
import BottomNav from "../components/BottomNav";
import type { ToastType } from "../components/Toast";
import Toast from "../components/Toast";
import UserBadgeSmall from "../components/UserBadge";
import { useUserProfile } from "../contexts/UserProfileContext";
import {
  changePassword,
  getCurrentUserName,
  getCurrentUserRole,
  updateMyProfile,
} from "../services/api";
import { deleteCookie, isAuthenticated } from "../utils/cookies";

function UserBadge({ size = 80 }: { size?: number }) {
  const userName = getCurrentUserName();
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        background: "#6c5ce7",
        border: "3px solid #a29bfe",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: `${size / 2.5}px`,
        fontWeight: "700",
        color: "#ffffff",
        boxShadow: "0 4px 12px rgba(108, 92, 231, 0.2)",
      }}
    >
      {initials}
    </div>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const {
    profile,
    updateProfileImage: updateGlobalProfileImage,
    refreshProfile,
  } = useUserProfile();
  const [name, setName] = useState(getCurrentUserName());
  const [email, setEmail] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [originalData, setOriginalData] = useState({
    name: "",
    email: "",
    profileImage: null as string | null,
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const userRole = getCurrentUserRole();
  const roleLabel = userRole === "10" ? "Técnico" : "Usuário";

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast("A imagem deve ter no máximo 5MB!", "error");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
        showToast("Foto carregada. Clique em 'Salvar Foto' para confirmar.", "info");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setProfileImage(null);
    showToast("Foto removida. Clique em 'Salvar Foto' para confirmar.", "info");
  };

  // Verifica se a foto foi alterada
  const hasImageChanged = profileImage !== originalData.profileImage;

  // Salvar apenas a foto
  const handleSaveImage = async () => {
    try {
      await updateMyProfile({ profileImage });

      // Atualiza os dados originais
      const newProfileImage = profileImage;
      setOriginalData((prev) => ({ ...prev, profileImage: newProfileImage }));

      // Atualiza a imagem no contexto global para todos os componentes
      updateGlobalProfileImage(newProfileImage);

      showToast("Foto atualizada com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao atualizar foto:", error);
      showToast(error instanceof Error ? error.message : "Erro ao atualizar foto", "error");
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }

    // Usar dados do contexto quando disponíveis (apenas na primeira carga)
    if (profile && !originalData.name) {
      setName(profile.username);
      setEmail(profile.email);
      setProfileImage(profile.profileImage || null);
      setOriginalData({
        name: profile.username,
        email: profile.email,
        profileImage: profile.profileImage || null,
      });
    }
  }, [navigate, profile, originalData.name]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Só processa se estiver em modo de edição
    if (!isEditing) {
      return;
    }

    // Validações
    if (name && name.trim().length < 3) {
      showToast("O nome deve ter pelo menos 3 caracteres", "error");
      return;
    }

    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showToast("Digite um e-mail válido", "error");
        return;
      }
    }

    try {
      // Envia apenas os campos que foram alterados
      const updates: {
        username?: string;
        email?: string;
        profileImage?: string | null;
      } = {};

      if (name && name.trim() && name !== originalData.name) {
        updates.username = name;
      }

      if (email && email.trim() && email !== originalData.email) {
        updates.email = email;
      }

      // Envia profileImage apenas se foi alterada
      if (profileImage !== originalData.profileImage) {
        updates.profileImage = profileImage;
      }

      // Se não há nada para atualizar, não faz nada
      if (Object.keys(updates).length === 0) {
        showToast("Nenhuma alteração para salvar", "info");
        return;
      }

      await updateMyProfile(updates);

      // Atualiza os dados originais após salvar
      setOriginalData({
        name: name,
        email: email,
        profileImage: profileImage,
      });

      // Atualiza a imagem no contexto global para todos os componentes
      if (profileImage !== originalData.profileImage) {
        updateGlobalProfileImage(profileImage);
      }

      // Atualiza o perfil completo no contexto
      await refreshProfile();

      showToast("Perfil atualizado com sucesso!", "success");
      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      showToast(error instanceof Error ? error.message : "Erro ao atualizar perfil", "error");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!currentPassword || currentPassword.trim().length === 0) {
      showToast("Digite sua senha atual", "error");
      return;
    }

    if (!newPassword || newPassword.trim().length === 0) {
      showToast("Digite a nova senha", "error");
      return;
    }

    if (newPassword.length < 6) {
      showToast("A nova senha deve ter pelo menos 6 caracteres", "error");
      return;
    }

    if (newPassword === currentPassword) {
      showToast("A nova senha deve ser diferente da senha atual", "error");
      return;
    }

    if (!confirmPassword || confirmPassword.trim().length === 0) {
      showToast("Confirme a nova senha", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("A confirmação não corresponde à nova senha", "error");
      return;
    }

    // Validação de complexidade (opcional mas recomendado)
    const hasNumber = /\d/.test(newPassword);
    const hasLetter = /[a-zA-Z]/.test(newPassword);

    if (!hasNumber || !hasLetter) {
      showToast("A senha deve conter letras e números", "warning");
    }

    try {
      await changePassword({
        currentPassword: currentPassword,
        newPassword: newPassword,
      });

      showToast("Senha alterada com sucesso", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      showToast("Falha ao alterar a senha", "error");
    }
  };

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="detail-page">
        <Sidebar />

        <div className="detail-page__content">
          <header className="detail-page__header">
            <div className="detail-page__breadcrumb">
              <span className="detail-page__breadcrumb-link" onClick={() => navigate("/home")}>
                Home
              </span>{" "}
              / <strong>Meu Perfil</strong>
            </div>

            <div className="detail-page__user-section">
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <UserBadgeSmall size={28} fontSize={11} />
                <span
                  style={{
                    fontSize: "13px",
                    color: "#495057",
                    fontWeight: "500",
                  }}
                >
                  {profile?.username || getCurrentUserName()}
                </span>
              </div>
              <button
                onClick={() => {
                  deleteCookie("token");
                  deleteCookie("user");
                  navigate("/login");
                }}
                className="btn btn--secondary btn--sm"
              >
                Sair
              </button>
            </div>
          </header>

          <main className="detail-page__main">
            {/* Card de Informações do Usuário */}
            <div className="profile-card">
              <div className="profile-header">
                <div className="profile-avatar">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt="Foto de perfil"
                      style={{
                        width: "100px",
                        height: "100px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "3px solid #a29bfe",
                        boxShadow: "0 4px 12px rgba(108, 92, 231, 0.2)",
                      }}
                    />
                  ) : (
                    <UserBadge size={100} />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: "none" }}
                    id="profile-image-input"
                  />
                </div>
                <div className="profile-info">
                  <h2 className="profile-name">{name}</h2>
                  <div
                    className="profile-role-badge"
                    style={{
                      background: userRole === "10" ? "#e3f2fd" : "#f3e5f5",
                      color: userRole === "10" ? "#1976d2" : "#7b1fa2",
                    }}
                  >
                    {roleLabel}
                  </div>
                  <div className="profile-actions">
                    <button
                      type="button"
                      onClick={() => document.getElementById("profile-image-input")?.click()}
                      className="btn btn--secondary btn--sm"
                      style={{ color: "#6c5ce7", borderColor: "#6c5ce7" }}
                    >
                      {profileImage ? "Alterar foto" : "Adicionar foto"}
                    </button>
                    {profileImage && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="btn btn--danger-outline btn--sm"
                      >
                        Remover foto
                      </button>
                    )}
                    {hasImageChanged && (
                      <>
                        <button
                          type="button"
                          onClick={handleSaveImage}
                          className="btn btn--primary btn--sm"
                        >
                          Salvar Foto
                        </button>
                        <button
                          type="button"
                          onClick={() => setProfileImage(originalData.profileImage)}
                          className="btn btn--cancel btn--sm"
                        >
                          Cancelar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveProfile}>
                <div className="profile-form-group">
                  <label className="profile-form-label">Nome completo</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!isEditing}
                    className="profile-form-input"
                    style={{ background: isEditing ? "#ffffff" : "#f8f9fa" }}
                  />
                </div>

                <div className="profile-form-group">
                  <label className="profile-form-label">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={!isEditing}
                    placeholder="seu@email.com"
                    className="profile-form-input"
                    style={{ background: isEditing ? "#ffffff" : "#f8f9fa" }}
                  />
                </div>

                <div className="profile-button-group">
                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsEditing(true);
                      }}
                      className="btn btn--primary"
                    >
                      Editar Perfil
                    </button>
                  ) : (
                    <>
                      <button type="submit" className="btn btn--primary btn--sm">
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          setName(originalData.name);
                          setEmail(originalData.email);
                          setProfileImage(originalData.profileImage);
                        }}
                        className="btn btn--cancel btn--sm"
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                </div>
              </form>
            </div>

            {/* Card de Alteração de Senha */}
            <div className="profile-card">
              <h3 style={{ margin: "0 0 20px 0", fontSize: "18px", color: "#212529" }}>
                Alterar Senha
              </h3>

              <form onSubmit={handleChangePassword}>
                <div className="profile-form-group">
                  <label className="profile-form-label">Senha atual</label>
                  <PasswordInput
                    id="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Digite sua senha atual"
                    autoComplete="current-password"
                  />
                </div>

                <div className="profile-form-group">
                  <label className="profile-form-label">Nova senha</label>
                  <PasswordInput
                    id="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite sua nova senha"
                    autoComplete="new-password"
                  />
                </div>

                <div className="profile-form-group">
                  <label className="profile-form-label">Confirmar nova senha</label>
                  <PasswordInput
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirme sua nova senha"
                    autoComplete="new-password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!currentPassword || !newPassword || !confirmPassword}
                  className="btn btn--primary btn--sm"
                >
                  Alterar Senha
                </button>
              </form>
            </div>
          </main>
        </div>
      </div>
      <BottomNav />
    </>
  );
}
