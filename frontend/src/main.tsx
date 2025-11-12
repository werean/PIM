import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

// Contextos
import { ToastProvider } from "./contexts/ToastContext";

// Estilos
import "./css/styles.css";

// Páginas
import HomePage from "./pages/Home";
import LoginPage from "./pages/Login";
import ProfilePage from "./pages/Profile";
import RegisterTicketPage from "./pages/RegisterTicket";
import RegisterUserPage from "./pages/RegisterUser";
import TicketDetailPage from "./pages/TicketDetail";
import TrashPage from "./pages/Trash";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterUserPage />} />
          <Route path="/ticket/new" element={<RegisterTicketPage />} />
          <Route path="/ticket/:id" element={<TicketDetailPage />} />
          <Route path="/trash" element={<TrashPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  </StrictMode>
);
