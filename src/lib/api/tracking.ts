import { apiClient } from "@/lib/api/client";
import type { LatestLocationResponse } from "@/types/api";

export async function fetchLatestLocation(tripId: string) {
  const { data } = await apiClient.get<LatestLocationResponse>(
    `/trips/${tripId}/locations/latest`
  );
  return data.data ?? data.location ?? null;
}
