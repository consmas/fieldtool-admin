import { apiClient } from "@/lib/api/client";
import type { PreTripInspection } from "@/types/api";

export async function fetchPreTrip(tripId: string) {
  const { data } = await apiClient.get<PreTripInspection>(
    `/trips/${tripId}/pre_trip`
  );
  return data ?? null;
}
