import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getCookie } from "../utils/cookies";

interface PrivateRouteProps {
  children: React.ReactNode;
}

// Decodifica o payload do JWT para verificar expiração
function isTokenExpired(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    const exp = decoded.exp;
    if (!exp) return false;
    // exp é em segundos, Date.now() é em milissegundos
    return Date.now() >= exp * 1000;
  } catch {
    return true; // Se não conseguir decodificar, considera expirado
  }
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const token = getCookie("token");

    if (!token) {
      setIsAuthenticated(false);
      setIsChecking(false);
      return;
    }

    if (isTokenExpired(token)) {
      // Token expirado - remove o cookie
      document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      setIsAuthenticated(false);
      setIsChecking(false);
      return;
    }

    setIsAuthenticated(true);
    setIsChecking(false);
  }, [location.pathname]);

  if (isChecking) {
    // Pode mostrar um loading enquanto verifica
    return null;
  }

  if (!isAuthenticated) {
    // Redireciona para login, salvando a página atual para retornar depois
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
