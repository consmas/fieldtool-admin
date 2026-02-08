import { apiClient } from "@/lib/api/client";
import type { User } from "@/types/api";

export async function fetchUsers(): Promise<User[]> {
  const { data } = await apiClient.get<User[] | { data: User[] }>("/users");
  if (Array.isArray(data)) return data;
  return data.data ?? [];
}

export async function fetchUser(id: number): Promise<User | null> {
  const { data } = await apiClient.get<User>(`/users/${id}`);
  return data ?? null;
}

export async function createUser(payload: Partial<User> & { password?: string; password_confirmation?: string }) {
  const { data } = await apiClient.post<User>("/users", { user: payload });
  return data;
}

export async function updateUser(id: number, payload: Partial<User> & { password?: string; password_confirmation?: string }) {
  const { data } = await apiClient.patch<User>(`/users/${id}`, { user: payload });
  return data;
}

export async function deleteUser(id: number) {
  const { data } = await apiClient.delete(`/users/${id}`);
  return data;
}
