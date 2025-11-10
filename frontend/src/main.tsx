import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

// Estilos
import "./css/styles.css";

// Páginas
import HomePage from "./pages/Home";
import LoginPage from "./pages/Login";
import RegisterTicketPage from "./pages/RegisterTicket";
import RegisterUserPage from "./pages/RegisterUser";
import TicketDetailPage from "./pages/TicketDetail";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterUserPage />} />
        <Route path="/ticket/new" element={<RegisterTicketPage />} />
        <Route path="/ticket/:id" element={<TicketDetailPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
