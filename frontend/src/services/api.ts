export const BASE_URL = "http://localhost:8080";

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${path} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} failed: ${res.status} ${text}`);
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
