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

// Componentes
import AppHeader from "./components/AppHeader";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AppHeader />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterUserPage />} />
        <Route path="/ticket/new" element={<RegisterTicketPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
