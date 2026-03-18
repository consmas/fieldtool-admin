import { apiClient } from "@/lib/api/client";
import type { Vehicle } from "@/types/api";

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function normalizeVehiclePayload(data: unknown): Vehicle {
  const root = toRecord(data);
  const raw =
    (root.data && typeof root.data === "object" ? root.data : null) ??
    (root.vehicle && typeof root.vehicle === "object" ? root.vehicle : null) ??
    root;

  const vehicle = { ...(raw as Vehicle) };
  const ins = toRecord(vehicle.insurance as unknown);

  // Map nested insurance.* → flat vehicle.insurance_* (API returns nested object)
  vehicle.insurance_policy_number = (ins.policy_number as string | null | undefined) ?? vehicle.insurance_policy_number ?? null;
  vehicle.insurance_provider = (ins.provider as string | null | undefined) ?? vehicle.insurance_provider ?? null;
  vehicle.insurance_issued_at = (ins.issued_at as string | null | undefined) ?? vehicle.insurance_issued_at ?? null;
  vehicle.insurance_expires_at = (ins.expires_at as string | null | undefined) ?? vehicle.insurance_expires_at ?? null;
  vehicle.insurance_coverage_amount = (ins.coverage_amount as number | null | undefined) ?? vehicle.insurance_coverage_amount ?? null;
  vehicle.insurance_notes = (ins.notes as string | null | undefined) ?? vehicle.insurance_notes ?? null;
  vehicle.insurance_document_url = (ins.document_url as string | null | undefined) ?? vehicle.insurance_document_url ?? null;

  return vehicle;
}

export async function fetchVehicles(): Promise<Vehicle[]> {
  const { data } = await apiClient.get<Vehicle[] | { data: Vehicle[] } | { vehicles: Vehicle[] }>("/vehicles");
  if (Array.isArray(data)) return data.map((item) => normalizeVehiclePayload(item));
  const payload = toRecord(data);
  const list =
    (Array.isArray(payload.data) ? payload.data : null) ??
    (Array.isArray(payload.vehicles) ? payload.vehicles : null) ??
    [];
  return (list as unknown[]).map((item) => normalizeVehiclePayload(item));
}

export async function fetchVehicle(id: number): Promise<Vehicle | null> {
  const { data } = await apiClient.get<Vehicle | { data: Vehicle } | { vehicle: Vehicle }>(`/vehicles/${id}`);
  if (!data) return null;
  return normalizeVehiclePayload(data);
}

export async function createVehicle(payload: Partial<Vehicle> | FormData) {
  if (payload instanceof FormData) {
    const { data } = await apiClient.post<Vehicle | { data: Vehicle } | { vehicle: Vehicle }>("/vehicles", payload, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return normalizeVehiclePayload(data);
  }
  const { data } = await apiClient.post<Vehicle | { data: Vehicle } | { vehicle: Vehicle }>("/vehicles", { vehicle: payload });
  return normalizeVehiclePayload(data);
}

export async function updateVehicle(id: number, payload: Partial<Vehicle> | FormData) {
  if (payload instanceof FormData) {
    const { data } = await apiClient.patch<Vehicle | { data: Vehicle } | { vehicle: Vehicle }>(`/vehicles/${id}`, payload, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return normalizeVehiclePayload(data);
  }
  const { data } = await apiClient.patch<Vehicle | { data: Vehicle } | { vehicle: Vehicle }>(`/vehicles/${id}`, { vehicle: payload });
  return normalizeVehiclePayload(data);
}

export async function deleteVehicle(id: number) {
  const { data } = await apiClient.delete(`/vehicles/${id}`);
  return data;
}
