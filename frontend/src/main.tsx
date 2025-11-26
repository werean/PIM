import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

// Contextos
import { ToastProvider } from "./contexts/ToastContext";
import { UserProfileProvider } from "./contexts/UserProfileContext";

// Componentes
import PrivateRoute from "./components/PrivateRoute";

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
            {/* Rotas públicas */}
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterUserPage />} />

            {/* Rotas protegidas */}
            <Route
              path="/home"
              element={
                <PrivateRoute>
                  <HomePage />
                </PrivateRoute>
              }
            />
            <Route
              path="/ticket/new"
              element={
                <PrivateRoute>
                  <RegisterTicketPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/ticket/:id"
              element={
                <PrivateRoute>
                  <TicketDetailPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/ticket-triage"
              element={
                <PrivateRoute>
                  <TicketTriagePage />
                </PrivateRoute>
              }
            />
            <Route
              path="/trash"
              element={
                <PrivateRoute>
                  <TrashPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <ProfilePage />
                </PrivateRoute>
              }
            />
            <Route
              path="/knowledgebase"
              element={
                <PrivateRoute>
                  <KnowledgeBasePage />
                </PrivateRoute>
              }
            />
            <Route
              path="/knowledgebase/create"
              element={
                <PrivateRoute>
                  <CreateArticlePage />
                </PrivateRoute>
              }
            />
            <Route
              path="/knowledgebase/:id"
              element={
                <PrivateRoute>
                  <ViewArticlePage />
                </PrivateRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </UserProfileProvider>
    </ToastProvider>
  </StrictMode>
);
