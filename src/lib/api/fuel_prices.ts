import { apiClient } from "@/lib/api/client";
import type { FuelPrice } from "@/types/api";

export async function fetchFuelPrices(): Promise<FuelPrice[]> {
  const { data } = await apiClient.get<FuelPrice[] | { data: FuelPrice[] }>("/fuel_prices");
  if (Array.isArray(data)) return data;
  return data.data ?? [];
}

export async function createFuelPrice(payload: Partial<FuelPrice>): Promise<FuelPrice> {
  const { data } = await apiClient.post<FuelPrice>("/fuel_prices", { fuel_price: payload });
  return data;
}
