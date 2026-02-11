import { apiClient } from "@/lib/api/client";
import type { TripStop } from "@/types/api";

export async function createTripStop(tripId: number, payload: TripStop) {
  const { data } = await apiClient.post(`/trips/${tripId}/stops`, payload);
  return data;
}
