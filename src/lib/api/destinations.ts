import { apiClient } from "@/lib/api/client";
import type { Destination, RateCalculationResponse } from "@/types/api";

export type DestinationPayload = Partial<
  Pick<
    Destination,
    | "name"
    | "average_distance_km"
    | "base_price_per_ton"
    | "tons_per_trip"
    | "base_km"
    | "base_trip_cost"
    | "kms_per_liter"
    | "liters_per_km"
    | "fuel_price_ref"
    | "additional_provision_pct"
    | "active"
  >
>;

export type DestinationPreviewPayload = DestinationPayload & {
  current_fuel_price?: number;
  expected_rate?: number;
};

export async function fetchDestinations(): Promise<Destination[]> {
  const { data } = await apiClient.get<Destination[] | { data: Destination[] }>("/destinations");
  if (Array.isArray(data)) return data;
  return data.data ?? [];
}

export async function fetchDestination(id: number): Promise<Destination | null> {
  const { data } = await apiClient.get<Destination>(`/destinations/${id}`);
  return data ?? null;
}

export async function createDestination(payload: DestinationPayload): Promise<Destination> {
  const { data } = await apiClient.post<Destination>("/destinations", { destination: payload });
  return data;
}

export async function updateDestination(id: number, payload: DestinationPayload): Promise<Destination> {
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
  destination?: DestinationPreviewPayload;
  average_distance_km?: number;
  base_price_per_ton?: number;
  tons_per_trip?: number;
  base_km?: number;
  base_trip_cost?: number;
  kms_per_liter?: number;
  liters_per_km?: number;
  fuel_price_ref?: number;
  additional_provision_pct?: number;
  active?: boolean;
  current_fuel_price?: number;
  expected_rate?: number;
  period?: string;
}): Promise<RateCalculationResponse> {
  const requestPayload = "destination" in payload ? payload : { destination: payload };
  const { data } = await apiClient.post<RateCalculationResponse>(
    "/destinations/preview_rate",
    requestPayload
  );
  return data;
}
