import { getCookie } from "../utils/cookies";

const _meta = (
  import.meta as unknown as {
    env?: { VITE_API_URL?: string; DEV?: boolean };
  }
).env;
export const BASE_URL = _meta?.VITE_API_URL ?? (_meta?.DEV ? "http://localhost:8080" : "");

// Função para lidar com erro 401 - redireciona para login
function handleUnauthorized() {
  // Remove o cookie expirado
  document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  // Redireciona para login se não estiver já na página de login
  if (!window.location.pathname.includes("/login")) {
    window.location.href = "/login";
  }
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getCookie("token");
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers,
    ...init,
  });

  if (res.status === 401) {
    handleUnauthorized();
    throw new Error(`GET ${path} failed: 401 Unauthorized`);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${path} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  const token = getCookie("token");
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    redirect: "manual", // Não seguir redirects automaticamente
    ...init,
  });

  // Se for redirect, ignorar e tratar como sucesso
  if (res.type === "opaqueredirect" || res.status === 0) {
    return {} as T;
  }

  if (res.status === 401) {
    handleUnauthorized();
    throw new Error(`POST ${path} failed: 401 Unauthorized`);
  }

  if (!res.ok) {
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      // Lança um erro estruturado que preserva a resposta completa
      const error = new Error(
        `POST ${path} failed: ${res.status} ${data?.message || text}`
      ) as Error & { response?: { data: unknown } };
      error.response = { data };
      throw error;
    } catch (parseError) {
      // Se não conseguir fazer parse do JSON, lança erro simples
      if ((parseError as Error & { response?: unknown }).response) {
        throw parseError; // Re-lança se já é nosso erro estruturado
      }
      throw new Error(`POST ${path} failed: ${res.status} ${text}`);
    }
  }
  return res.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  const token = getCookie("token");
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
    ...init,
  });

  if (res.status === 401) {
    handleUnauthorized();
    throw new Error(`PUT ${path} failed: 401 Unauthorized`);
  }

  if (!res.ok) {
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      const error = new Error(
        `PUT ${path} failed: ${res.status} ${data?.message || text}`
      ) as Error & { response?: { data: unknown } };
      error.response = { data };
      throw error;
    } catch (parseError) {
      if ((parseError as Error & { response?: unknown }).response) {
        throw parseError;
      }
      throw new Error(`PUT ${path} failed: ${res.status} ${text}`);
    }
  }
  return res.json() as Promise<T>;
}

export async function apiDelete<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
  const token = getCookie("token");
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "DELETE",
    headers,
    body: body ? JSON.stringify(body) : undefined,
    ...init,
  });

  if (res.status === 401) {
    handleUnauthorized();
    throw new Error(`DELETE ${path} failed: 401 Unauthorized`);
  }

  if (!res.ok) {
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      const error = new Error(
        `DELETE ${path} failed: ${res.status} ${data?.message || data?.error || text}`
      ) as Error & { response?: { data: unknown } };
      error.response = { data };
      throw error;
    } catch (parseError) {
      if ((parseError as Error & { response?: unknown }).response) {
        throw parseError;
      }
      throw new Error(`DELETE ${path} failed: ${res.status} ${text}`);
    }
  }

  // Tentar retornar JSON, mas se não houver corpo, retornar vazio
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export type Role = 5 | 10; // 5 = Usuário, 10 = Técnico

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  role: Role;
}

export interface CreateTicketPayload {
  title: string;
  ticketBody: string;
  urgency: 1 | 2 | 3;
}

export interface Ticket {
  id?: number;
  title: string;
  ticketBody?: string;
  urgency: 1 | 2 | 3;
  status: 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1=Aberto, 2=Pendente, 3=Resolvido, 4=Reaberto, 5=Aguardando Aprovação, 6=Aguardando Exclusão, 7=Deletado
  resolutionMessage?: string;
  resolutionApproved?: boolean | null;
  reopenedAt?: string;
  pendingDeletion?: boolean | null;
  deletionRequestedBy?: string;
  deletionRequestedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  editedAt?: string;
  editedBy?: string;
  editedByUsername?: string;
  aiSummary?: string; // Resumo das ações da triagem com IA
  aiConclusion?: string; // Síntese conclusiva da triagem
  aiSummaryGeneratedAt?: string; // Data de geração do resumo
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
  username?: string;
  comments?: Comment[];
}

export interface Comment {
  id: number;
  ticketId: number;
  commentBody: string;
  createdAt: string;
  userId: string;
  username: string;
}

export interface CreateCommentPayload {
  ticketId: number;
  commentBody: string;
}

export interface ResolveTicketPayload {
  resolutionMessage: string;
}

// Helper para verificar se o usuário é técnico
export function isTechnician(): boolean {
  const user = getCookie("user");
  if (!user) return false;
  try {
    const userData = JSON.parse(user);
    return userData.role === 10;
  } catch {
    return false;
  }
}

// Helper para pegar o userId atual
export function getCurrentUserId(): string | null {
  const user = getCookie("user");
  if (!user) return null;
  try {
    const userData = JSON.parse(user);
    return userData.id;
  } catch {
    return null;
  }
}

// Helper para pegar o nome do usuário
export function getCurrentUserName(): string {
  const user = getCookie("user");
  if (!user) return "Usuário";
  try {
    const userData = JSON.parse(user);
    return userData.username || "Usuário";
  } catch {
    return "Usuário";
  }
}

// Helper para pegar a role do usuário
export function getCurrentUserRole(): string {
  const user = getCookie("user");
  if (!user) return "Usuário";
  try {
    const userData = JSON.parse(user);
    return userData.role === 10 ? "Técnico" : "Usuário";
  } catch {
    return "Usuário";
  }
}

// Tipos para perfil
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: number;
  profileImage?: string | null;
}

export interface UpdateProfilePayload {
  username?: string;
  email?: string;
  profileImage?: string | null;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

// API de perfil
export async function getMyProfile(): Promise<UserProfile> {
  return apiGet<UserProfile>("/users/profile/me");
}

export async function updateMyProfile(data: UpdateProfilePayload): Promise<void> {
  const token = getCookie("token");
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}/users/profile/me`, {
    method: "PUT",
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const text = await res.text();
    try {
      const errorData = JSON.parse(text);
      throw new Error(errorData.message || "Erro ao atualizar perfil");
    } catch {
      throw new Error(`Erro ao atualizar perfil: ${res.status}`);
    }
  }
}

export async function changePassword(data: ChangePasswordPayload): Promise<void> {
  const token = getCookie("token");
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}/users/change-password`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const text = await res.text();
    try {
      const errorData = JSON.parse(text);
      throw new Error(errorData.message || "Erro ao alterar senha");
    } catch {
      throw new Error(`Erro ao alterar senha: ${res.status}`);
    }
  }
}
