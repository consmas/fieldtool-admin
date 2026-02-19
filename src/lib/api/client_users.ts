import { apiClient } from "@/lib/api/client";

type UnknownMap = Record<string, unknown>;

function asRecord(value: unknown): UnknownMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as UnknownMap;
}

function asList(value: unknown): UnknownMap[] {
  if (Array.isArray(value)) return value as UnknownMap[];
  const payload = asRecord(value);
  const keys = ["data", "items", "results", "users", "client_users"];
  for (const key of keys) {
    const candidate = payload[key];
    if (Array.isArray(candidate)) return candidate as UnknownMap[];
  }
  return [];
}

export async function fetchClientUsers() {
  const { data } = await apiClient.get("/api/v1/client/users");
  return asList(data);
}

export async function createClientUser(payload: UnknownMap) {
  try {
    const { data } = await apiClient.post("/api/v1/client/users", payload);
    return asRecord(data);
  } catch {
    const { data } = await apiClient.post("/api/v1/client/users", { user: payload });
    return asRecord(data);
  }
}

export async function updateClientUser(id: number | string, payload: UnknownMap) {
  try {
    const { data } = await apiClient.patch(`/api/v1/client/users/${id}`, payload);
    return asRecord(data);
  } catch {
    const { data } = await apiClient.patch(`/api/v1/client/users/${id}`, { user: payload });
    return asRecord(data);
  }
}
