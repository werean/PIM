import { BrowserRouter, Routes, Route } from "react-router-dom";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import LoginPage from "./pages/Login";
import Tickets from "./pages/Tickets";
import "./css/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/tickets" element={<Tickets />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
