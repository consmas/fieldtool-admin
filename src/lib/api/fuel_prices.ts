import { apiClient } from "@/lib/api/client";
import type { FuelPrice } from "@/types/api";

export async function fetchFuelPrices(): Promise<FuelPrice[]> {
  const { data } = await apiClient.get<FuelPrice[] | { data: FuelPrice[] }>("/fuel_prices");
  if (Array.isArray(data)) return data;
  return data.data ?? [];
}

export async function fetchFuelPrice(id: number): Promise<FuelPrice | null> {
  const { data } = await apiClient.get<FuelPrice>(`/fuel_prices/${id}`);
  return data ?? null;
}

export async function createFuelPrice(payload: Partial<FuelPrice>): Promise<FuelPrice> {
  const { data } = await apiClient.post<FuelPrice>("/fuel_prices", { fuel_price: payload });
  return data;
}

export async function updateFuelPrice(id: number, payload: Partial<FuelPrice>): Promise<FuelPrice> {
  const { data } = await apiClient.patch<FuelPrice>(`/fuel_prices/${id}`, { fuel_price: payload });
  return data;
}
