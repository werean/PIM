import { getCookie } from "../utils/cookies";

const _meta = (
  import.meta as unknown as {
    env?: { VITE_API_URL?: string; DEV?: boolean };
  }
).env;
export const BASE_URL = _meta?.VITE_API_URL ?? (_meta?.DEV ? "http://localhost:8080" : "");

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
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      const msg = data?.message ?? JSON.stringify(data);
      throw new Error(`POST ${path} failed: ${res.status} ${msg}`);
    } catch {
      throw new Error(`POST ${path} failed: ${res.status} ${text}`);
    }
  }
  return res.json() as Promise<T>;
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
  status: 1 | 2 | 3; // 1=Aberto, 2=Pendente, 3=Resolvido
  resolutionMessage?: string;
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
