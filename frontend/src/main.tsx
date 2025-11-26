import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

// Contextos
import { ToastProvider } from "./contexts/ToastContext";
import { UserProfileProvider } from "./contexts/UserProfileContext";

// Estilos
import "./css/styles.css";
import "./css/KnowledgeBase.css";

// Páginas
import HomePage from "./pages/Home";
import LoginPage from "./pages/Login";
import ProfilePage from "./pages/Profile";
import RegisterTicketPage from "./pages/RegisterTicket";
import RegisterUserPage from "./pages/RegisterUser";
import TicketDetailPage from "./pages/TicketDetail";
import TicketTriagePage from "./pages/TicketTriage";
import TrashPage from "./pages/Trash";
import KnowledgeBasePage from "./pages/KnowledgeBase";
import CreateArticlePage from "./pages/CreateArticle";
import ViewArticlePage from "./pages/ViewArticle";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ToastProvider>
      <UserProfileProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterUserPage />} />
            <Route path="/ticket/new" element={<RegisterTicketPage />} />
            <Route path="/ticket/:id" element={<TicketDetailPage />} />
            <Route path="/ticket-triage" element={<TicketTriagePage />} />
            <Route path="/trash" element={<TrashPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/knowledgebase" element={<KnowledgeBasePage />} />
            <Route path="/knowledgebase/create" element={<CreateArticlePage />} />
            <Route path="/knowledgebase/:id" element={<ViewArticlePage />} />
          </Routes>
        </BrowserRouter>
      </UserProfileProvider>
    </ToastProvider>
  </StrictMode>
);
