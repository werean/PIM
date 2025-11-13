import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

/**
 * Layout padrão das páginas com sidebar
 * Usa HTML semântico (aside para sidebar, main para conteúdo principal)
 * Em mobile (≤768px), a sidebar é substituída pela bottom navigation
 */
export default function PageLayout({ children, className = "" }: PageLayoutProps) {
  return (
    <div className={`page-layout ${className}`}>
      <Sidebar />
      <main className="page-layout__main">{children}</main>
      <BottomNav />
    </div>
  );
}
