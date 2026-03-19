import { apiClient } from "@/lib/api/client";
import type { Destination, RateCalculationResponse } from "@/types/api";

export async function fetchDestinations(): Promise<Destination[]> {
  const { data } = await apiClient.get<Destination[] | { data: Destination[] }>("/destinations");
  if (Array.isArray(data)) return data;
  return data.data ?? [];
}

export async function fetchDestination(id: number): Promise<Destination | null> {
  const { data } = await apiClient.get<Destination>(`/destinations/${id}`);
  return data ?? null;
}

export async function createDestination(payload: Partial<Destination>): Promise<Destination> {
  const { data } = await apiClient.post<Destination>("/destinations", { destination: payload });
  return data;
}

export async function updateDestination(id: number, payload: Partial<Destination>): Promise<Destination> {
  const { data } = await apiClient.patch<Destination>(`/destinations/${id}`, { destination: payload });
  return data;
}

export async function deleteDestination(id: number) {
  const { data } = await apiClient.delete(`/destinations/${id}`);
  return data;
}

export async function calculateDestinationRate(
  id: number,
  payload: { fuel_price_current?: number; additional_km?: number; period?: string }
): Promise<RateCalculationResponse> {
  const { data } = await apiClient.post<RateCalculationResponse>(
    `/destinations/${id}/calculate`,
    payload
  );
  return data;
}

export async function previewDestinationRate(payload: {
  average_distance_km?: number;
  base_km?: number;
  base_trip_cost?: number;
  kms_per_liter?: number;
  additional_provision_pct?: number;
  period?: string;
}): Promise<RateCalculationResponse> {
  const { data } = await apiClient.post<RateCalculationResponse>(
    "/destinations/preview_rate",
    payload
  );
  return data;
}
