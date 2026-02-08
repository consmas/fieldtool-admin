import { apiClient } from "@/lib/api/client";
import type { Trip, TripListResponse, TripResponse } from "@/types/api";

export async function fetchTrips(): Promise<Trip[]> {
  const { data } = await apiClient.get<TripListResponse | Trip[]>("/trips");
  if (Array.isArray(data)) return data;
  return data.data ?? data.trips ?? [];
}

export async function fetchTrip(id: string): Promise<Trip | null> {
  const { data } = await apiClient.get<TripResponse | Trip>(`/trips/${id}`);
  if ("id" in data) return data;
  return data.data ?? data.trip ?? null;
}

export async function createTrip(payload: Partial<Trip>): Promise<Trip> {
  const { data } = await apiClient.post<TripResponse | Trip>("/trips", {
    trip: payload,
  });
  if ("id" in data) return data;
  return data.data ?? data.trip ?? payload as Trip;
}

export async function updateTrip(id: number, payload: Partial<Trip>): Promise<Trip> {
  const { data } = await apiClient.patch<TripResponse | Trip>(
    `/trips/${id}`,
    { trip: payload }
  );
  if ("id" in data) return data;
  return data.data ?? data.trip ?? payload as Trip;
}

export async function deleteTrip(id: number) {
  const { data } = await apiClient.delete(`/trips/${id}`);
  return data;
}
