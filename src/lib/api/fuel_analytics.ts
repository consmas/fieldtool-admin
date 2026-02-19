import { apiClient } from "@/lib/api/client";

type UnknownMap = Record<string, unknown>;

function cleanParams(params: UnknownMap) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === "string") return value.trim().length > 0;
      return true;
    })
  );
}

function asRecord(value: unknown): UnknownMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as UnknownMap;
}

function unwrapObject(value: unknown): UnknownMap {
  const payload = asRecord(value);
  if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
    return payload.data as UnknownMap;
  }
  return payload;
}

function unwrapList(value: unknown): UnknownMap[] {
  if (Array.isArray(value)) return value as UnknownMap[];
  const payload = asRecord(value);
  if (Array.isArray(payload.data)) return payload.data as UnknownMap[];
  if (Array.isArray(payload.items)) return payload.items as UnknownMap[];
  if (Array.isArray(payload.results)) return payload.results as UnknownMap[];
  if (Array.isArray(payload.logs)) return payload.logs as UnknownMap[];
  if (Array.isArray(payload.anomalies)) return payload.anomalies as UnknownMap[];
  if (Array.isArray(payload.analysis)) return payload.analysis as UnknownMap[];
  return [];
}

export async function fetchFuelLogs(
  params: {
    vehicle_id?: number;
    trip_id?: number;
    page?: number;
    per_page?: number;
    date_from?: string;
    date_to?: string;
  } = {}
) {
  if (params.vehicle_id) {
    const { data } = await apiClient.get(`/api/v1/vehicles/${params.vehicle_id}/fuel_logs`, {
      params: cleanParams({
        page: params.page,
        per_page: params.per_page,
        date_from: params.date_from,
        date_to: params.date_to,
      }),
    });
    return { raw: asRecord(data), items: unwrapList(data) };
  }
  const { data } = await apiClient.get("/api/v1/fuel_logs", { params: cleanParams(params) });
  return { raw: asRecord(data), items: unwrapList(data) };
}

export async function createVehicleFuelLog(vehicleId: number, payload: UnknownMap) {
  const { data } = await apiClient.post(`/api/v1/vehicles/${vehicleId}/fuel_logs`, payload);
  return unwrapObject(data);
}

export async function createTripFuelLog(tripId: number, payload: UnknownMap) {
  const { data } = await apiClient.post(`/api/v1/trips/${tripId}/fuel_logs`, payload);
  return unwrapObject(data);
}

export async function fetchFuelAnalysis(params: { status?: string; vehicle_id?: number; driver_id?: number } = {}) {
  const { data } = await apiClient.get("/api/v1/fuel/analysis", { params: cleanParams(params) });
  return { raw: asRecord(data), items: unwrapList(data) };
}

export async function fetchFuelAnomalies(params: { status?: string; vehicle_id?: number; driver_id?: number } = {}) {
  const { data } = await apiClient.get("/api/v1/fuel/anomalies", { params: cleanParams(params) });
  return { raw: asRecord(data), items: unwrapList(data) };
}

export async function investigateFuelAnalysis(
  id: number | string,
  payload: { status?: string; resolution_note?: string; notes?: string }
) {
  const { data } = await apiClient.patch(`/api/v1/fuel/analysis/${id}/investigate`, payload);
  return unwrapObject(data);
}

export async function fetchVehicleFuelTrend(vehicleId: number) {
  const { data } = await apiClient.get(`/api/v1/fuel/analysis/vehicle/${vehicleId}`);
  return asRecord(data);
}

export async function fetchDriverFuelTrend(driverId: number) {
  const { data } = await apiClient.get(`/api/v1/fuel/analysis/driver/${driverId}`);
  return asRecord(data);
}

export async function fetchFuelFleetReport(params: { date_from?: string; date_to?: string } = {}) {
  const { data } = await apiClient.get("/api/v1/reports/fuel", { params: cleanParams(params) });
  return asRecord(data);
}
