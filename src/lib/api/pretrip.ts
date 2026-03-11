import { apiClient } from "@/lib/api/client";
import type { PreTripInspection } from "@/types/api";

export async function fetchPreTrip(tripId: string) {
  try {
    const { data } = await apiClient.get<PreTripInspection | { exists?: boolean; pre_trip?: PreTripInspection | null; data?: PreTripInspection | null }>(
      `/api/v1/trips/${tripId}/pre_trip`
    );
    if (!data) return null;
    if (typeof data === "object" && !Array.isArray(data)) {
      const wrapper = data as { exists?: boolean; pre_trip?: PreTripInspection | null; data?: PreTripInspection | null };
      if (wrapper.exists === false) return null;
      if (wrapper.pre_trip) return wrapper.pre_trip;
      if (wrapper.data) return wrapper.data;
    }
    return data as PreTripInspection;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      // 404 here means no pre-trip has been submitted for this trip yet.
      return null;
    }
    throw error;
  }
}

export async function createPreTrip(tripId: number, payload: FormData) {
  const { data } = await apiClient.post(`/api/v1/trips/${tripId}/pre_trip`, payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return (data as PreTripInspection) ?? null;
}

export async function updatePreTrip(tripId: number, payload: FormData) {
  const { data } = await apiClient.patch(`/api/v1/trips/${tripId}/pre_trip`, payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return (data as PreTripInspection) ?? null;
}

export async function verifyPreTripInspection(
  tripId: number,
  payload: { status: "approved" | "rejected"; note?: string }
) {
  const { data } = await apiClient.patch(`/api/v1/trips/${tripId}/pre_trip/verify`, payload);
  return data;
}

export async function confirmPreTripInspection(tripId: number) {
  const { data } = await apiClient.patch(`/api/v1/trips/${tripId}/pre_trip/confirm`, {});
  return data;
}
