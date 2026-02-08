import { apiClient } from "@/lib/api/client";
import type { Vehicle } from "@/types/api";

export async function fetchVehicles(): Promise<Vehicle[]> {
  const { data } = await apiClient.get<Vehicle[] | { data: Vehicle[] }>("/vehicles");
  if (Array.isArray(data)) return data;
  return data.data ?? [];
}

export async function fetchVehicle(id: number): Promise<Vehicle | null> {
  const { data } = await apiClient.get<Vehicle>(`/vehicles/${id}`);
  return data ?? null;
}

export async function createVehicle(payload: Partial<Vehicle>) {
  const { data } = await apiClient.post<Vehicle>("/vehicles", { vehicle: payload });
  return data;
}

export async function updateVehicle(id: number, payload: Partial<Vehicle>) {
  const { data } = await apiClient.patch<Vehicle>(`/vehicles/${id}`, { vehicle: payload });
  return data;
}

export async function deleteVehicle(id: number) {
  const { data } = await apiClient.delete(`/vehicles/${id}`);
  return data;
}
