import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getMyProfile, type UserProfile } from "../services/api";
import { isAuthenticated } from "../utils/cookies";

interface UserProfileContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  updateProfileImage: (image: string | null) => void;
}

const UserProfileContext = createContext<UserProfileContextType | null>(null);

// Hook exportado separadamente para evitar problemas com Fast Refresh
// eslint-disable-next-line react-refresh/only-export-components
export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error("useUserProfile must be used within a UserProfileProvider");
  }
  return context;
};

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!isAuthenticated()) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await getMyProfile();
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar perfil");
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  const updateProfileImage = useCallback((image: string | null) => {
    setProfile((prev) => (prev ? { ...prev, profileImage: image } : null));
  }, []);

  return (
    <UserProfileContext.Provider
      value={{ profile, isLoading, error, refreshProfile, updateProfileImage }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}
