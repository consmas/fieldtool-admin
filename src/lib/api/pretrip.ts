import { apiClient } from "@/lib/api/client";
import type { PreTripInspection } from "@/types/api";

export async function fetchPreTrip(tripId: string) {
  try {
    const { data } = await apiClient.get<PreTripInspection>(
      `/trips/${tripId}/pre_trip`
    );
    return data ?? null;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      // 404 here means no pre-trip has been submitted for this trip yet.
      return null;
    }
    throw error;
  }
}
