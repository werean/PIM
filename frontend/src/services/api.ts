const _meta = (
  import.meta as unknown as {
    env?: { VITE_API_URL?: string; DEV?: boolean };
  }
).env;
export const BASE_URL = _meta?.VITE_API_URL ?? (_meta?.DEV ? "http://localhost:8080" : "");

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem("token");
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
  const token = localStorage.getItem("token");
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

export type Role = 5 | 10 | 15;

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  role: Role;
}

export interface CreateTicketPayload {
  title: string;
  ticket_body: string;
  urgency: 1 | 2 | 3;
}

export interface Ticket {
  id?: number;
  title: string;
  ticket_body: string;
  urgency: 1 | 2 | 3;
  created_at?: string;
  updated_at?: string;
  status?: string;
}
