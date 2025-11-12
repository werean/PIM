import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCurrentUserName,
  getCurrentUserRole,
  getMyProfile,
  updateMyProfile,
  changePassword,
} from "../services/api";
import { isAuthenticated, deleteCookie } from "../utils/cookies";
import Sidebar from "../components/Sidebar";
import Toast from "../components/Toast";
import type { ToastType } from "../components/Toast";
import UserBadgeSmall from "../components/UserBadge";

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
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
        showToast("Imagem carregada com sucesso!", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setProfileImage(null);
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }

    // Carregar perfil do usuário
    getMyProfile()
      .then((profile) => {
        setName(profile.username);
        setEmail(profile.email);
        setProfileImage(profile.profileImage || null);
        setOriginalData({
          name: profile.username,
          email: profile.email,
          profileImage: profile.profileImage || null,
        });
      })
      .catch((error) => {
        console.error("Erro ao carregar perfil:", error);
        showToast("Erro ao carregar perfil do usuário", "error");
      });
  }, [navigate]);

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
      const updates: { username?: string; email?: string; profileImage?: string | null } = {};

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

      showToast("Senha alterada com sucesso!", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      showToast(error instanceof Error ? error.message : "Erro ao alterar senha", "error");
    }
  };

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />

        <div
          style={{
            marginLeft: "240px",
            width: "calc(100% - 240px)",
            minHeight: "100vh",
            background: "#f8f9fa",
          }}
        >
          <header
            style={{
              background: "#ffffff",
              borderBottom: "1px solid #e9ecef",
              padding: "12px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: "12px", color: "#6c757d" }}>
              <span
                style={{ cursor: "pointer", transition: "color 0.15s" }}
                onClick={() => navigate("/home")}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#212529";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#6c757d";
                }}
              >
                Home
              </span>{" "}
              / <strong style={{ color: "#212529" }}>Meu Perfil</strong>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <UserBadgeSmall size={28} fontSize={11} />
                <span style={{ fontSize: "13px", color: "#495057", fontWeight: "500" }}>
                  {getCurrentUserName()}
                </span>
              </div>
              <button
                onClick={() => {
                  deleteCookie("token");
                  deleteCookie("user");
                  navigate("/login");
                }}
                style={{
                  background: "transparent",
                  color: "#6c757d",
                  border: "1px solid #dee2e6",
                  borderRadius: "3px",
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "400",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#dc3545";
                  e.currentTarget.style.color = "#dc3545";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#dee2e6";
                  e.currentTarget.style.color = "#6c757d";
                }}
              >
                Sair
              </button>
            </div>
          </header>

          <main style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}>
            {/* Card de Informações do Usuário */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e9ecef",
                borderRadius: "6px",
                padding: "32px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "24px",
                  marginBottom: "32px",
                }}
              >
                <div style={{ position: "relative" }}>
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
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: "0 0 12px 0", fontSize: "24px", color: "#212529" }}>
                    {name}
                  </h2>
                  <div
                    style={{
                      display: "inline-block",
                      padding: "4px 12px",
                      background: userRole === "10" ? "#e3f2fd" : "#f3e5f5",
                      color: userRole === "10" ? "#1976d2" : "#7b1fa2",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: "500",
                      marginBottom: "12px",
                    }}
                  >
                    {roleLabel}
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <button
                      type="button"
                      onClick={() => document.getElementById("profile-image-input")?.click()}
                      style={{
                        padding: "6px 12px",
                        background: "transparent",
                        color: "#6c5ce7",
                        border: "1px solid #6c5ce7",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "500",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#6c5ce7";
                        e.currentTarget.style.color = "#ffffff";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#6c5ce7";
                      }}
                    >
                      {profileImage ? "Alterar foto" : "Adicionar foto"}
                    </button>
                    {profileImage && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        style={{
                          padding: "6px 12px",
                          background: "transparent",
                          color: "#dc3545",
                          border: "1px solid #dc3545",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "500",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#dc3545";
                          e.currentTarget.style.color = "#ffffff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "#dc3545";
                        }}
                      >
                        Remover foto
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveProfile}>
                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: "500",
                      color: "#495057",
                      marginBottom: "6px",
                    }}
                  >
                    Nome completo
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!isEditing}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      fontSize: "14px",
                      border: "1px solid #e0e0e0",
                      borderRadius: "4px",
                      background: isEditing ? "#ffffff" : "#f8f9fa",
                      color: "#212529",
                      boxSizing: "border-box",
                      cursor: isEditing ? "text" : "not-allowed",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: "500",
                      color: "#495057",
                      marginBottom: "6px",
                    }}
                  >
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={!isEditing}
                    placeholder="seu@email.com"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      fontSize: "14px",
                      border: "1px solid #e0e0e0",
                      borderRadius: "4px",
                      background: isEditing ? "#ffffff" : "#f8f9fa",
                      color: "#212529",
                      boxSizing: "border-box",
                      cursor: isEditing ? "text" : "not-allowed",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsEditing(true);
                      }}
                      style={{
                        padding: "10px 20px",
                        background: "#6c5ce7",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "14px",
                        fontWeight: "500",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#5b4cdb";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#6c5ce7";
                      }}
                    >
                      Editar Perfil
                    </button>
                  ) : (
                    <>
                      <button
                        type="submit"
                        style={{
                          padding: "8px 16px",
                          background: "#6c5ce7",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "3px",
                          fontSize: "13px",
                          fontWeight: "500",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#5b4cdb";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#6c5ce7";
                        }}
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          // Restaura os valores originais
                          setName(originalData.name);
                          setEmail(originalData.email);
                          setProfileImage(originalData.profileImage);
                        }}
                        style={{
                          padding: "8px 16px",
                          background: "transparent",
                          color: "#6c757d",
                          border: "1px solid #e0e0e0",
                          borderRadius: "3px",
                          fontSize: "13px",
                          fontWeight: "400",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "#6c757d";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "#e0e0e0";
                        }}
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                </div>
              </form>
            </div>

            {/* Card de Alteração de Senha */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e9ecef",
                borderRadius: "6px",
                padding: "32px",
              }}
            >
              <h3 style={{ margin: "0 0 20px 0", fontSize: "18px", color: "#212529" }}>
                Alterar Senha
              </h3>

              <form onSubmit={handleChangePassword}>
                <div style={{ marginBottom: "16px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: "500",
                      color: "#495057",
                      marginBottom: "6px",
                    }}
                  >
                    Senha atual
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Digite sua senha atual"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        paddingRight: "40px",
                        fontSize: "14px",
                        border: "1px solid #e0e0e0",
                        borderRadius: "4px",
                        background: "#ffffff",
                        color: "#212529",
                        boxSizing: "border-box",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      style={{
                        position: "absolute",
                        right: "8px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px 8px",
                        color: "#6c757d",
                        fontSize: "14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      title={showCurrentPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showCurrentPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: "500",
                      color: "#495057",
                      marginBottom: "6px",
                    }}
                  >
                    Nova senha
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Digite sua nova senha"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        paddingRight: "40px",
                        fontSize: "14px",
                        border: "1px solid #e0e0e0",
                        borderRadius: "4px",
                        background: "#ffffff",
                        color: "#212529",
                        boxSizing: "border-box",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{
                        position: "absolute",
                        right: "8px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px 8px",
                        color: "#6c757d",
                        fontSize: "14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      title={showNewPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showNewPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: "500",
                      color: "#495057",
                      marginBottom: "6px",
                    }}
                  >
                    Confirmar nova senha
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirme sua nova senha"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        paddingRight: "40px",
                        fontSize: "14px",
                        border: "1px solid #e0e0e0",
                        borderRadius: "4px",
                        background: "#ffffff",
                        color: "#212529",
                        boxSizing: "border-box",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        position: "absolute",
                        right: "8px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px 8px",
                        color: "#6c757d",
                        fontSize: "14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      title={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!currentPassword || !newPassword || !confirmPassword}
                  style={{
                    padding: "8px 16px",
                    background:
                      currentPassword && newPassword && confirmPassword ? "#6c5ce7" : "#e9ecef",
                    color:
                      currentPassword && newPassword && confirmPassword ? "#ffffff" : "#adb5bd",
                    border: "none",
                    borderRadius: "3px",
                    fontSize: "13px",
                    fontWeight: "500",
                    cursor:
                      currentPassword && newPassword && confirmPassword ? "pointer" : "not-allowed",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (currentPassword && newPassword && confirmPassword) {
                      e.currentTarget.style.background = "#5b4cdb";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentPassword && newPassword && confirmPassword) {
                      e.currentTarget.style.background = "#6c5ce7";
                    }
                  }}
                >
                  Alterar Senha
                </button>
              </form>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
