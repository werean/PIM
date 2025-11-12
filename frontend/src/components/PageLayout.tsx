import type { ReactNode } from "react";
import Sidebar from "./Sidebar";

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

/**
 * Layout padrão das páginas com sidebar
 * Usa HTML semântico (aside para sidebar, main para conteúdo principal)
 */
export default function PageLayout({
  children,
  className = "",
}: PageLayoutProps) {
  return (
    <div className={`page-layout ${className}`}>
      <Sidebar />
      <main className="page-layout__main">{children}</main>
    </div>
  );
}
