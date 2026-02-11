import { apiClient } from "@/lib/api/client";
import type { Trip } from "@/types/api";

export async function verifyPreTrip(
  tripId: number,
  payload: { status: "approved" | "rejected"; note?: string }
) {
  const { data } = await apiClient.patch(
    `/trips/${tripId}/pre_trip/verify`,
    payload
  );
  return data;
}

export async function confirmPreTrip(tripId: number) {
  const { data } = await apiClient.patch(`/trips/${tripId}/pre_trip/confirm`, {});
  return data;
}

export async function updateFuelAllocation(tripId: number, payload: Partial<Trip>) {
  const { data } = await apiClient.patch(`/trips/${tripId}/fuel_allocation`, {
    fuel_allocation: payload,
  });
  return data;
}

export async function updateRoadExpense(tripId: number, payload: Partial<Trip>) {
  const { data } = await apiClient.patch(`/trips/${tripId}/road_expense`, {
    road_expense: payload,
  });
  return data;
}

export async function uploadRoadExpenseReceipt(tripId: number, file: File) {
  const formData = new FormData();
  formData.append("receipt", file);
  const { data } = await apiClient.patch(
    `/trips/${tripId}/road_expense/receipt`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );
  return data;
}
