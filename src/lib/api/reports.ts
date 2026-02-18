import { apiClient } from "@/lib/api/client";

export interface ReportFilters {
  date_from?: string;
  date_to?: string;
  status?: string;
  category?: string;
  trip_id?: number;
  vehicle_id?: number;
  driver_id?: number;
}

function cleanFilters(filters: ReportFilters) {
  const entries = Object.entries(filters).filter(([, value]) => {
    if (value === undefined || value === null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    return true;
  });
  return Object.fromEntries(entries);
}

function unwrap<T>(data: unknown): T {
  if (data && typeof data === "object" && "data" in (data as Record<string, unknown>)) {
    const payload = data as Record<string, unknown>;
    const keys = Object.keys(payload);
    // Only unwrap when payload is a pure transport wrapper like { data: ... }.
    if (keys.length === 1) {
      return (payload.data as T) ?? ({} as T);
    }
  }
  return (data as T) ?? ({} as T);
}

export async function fetchReportsOverview(filters: ReportFilters) {
  const { data } = await apiClient.get("/reports/overview", { params: cleanFilters(filters) });
  return unwrap<Record<string, unknown>>(data);
}

export async function fetchReportsTrips(filters: ReportFilters) {
  const { data } = await apiClient.get("/reports/trips", { params: cleanFilters(filters) });
  return unwrap<Record<string, unknown>>(data);
}

export async function fetchReportsExpenses(filters: ReportFilters) {
  const { data } = await apiClient.get("/reports/expenses", { params: cleanFilters(filters) });
  return unwrap<Record<string, unknown>>(data);
}

export async function fetchReportsDrivers(filters: ReportFilters) {
  const { data } = await apiClient.get("/reports/drivers", { params: cleanFilters(filters) });
  return unwrap<Record<string, unknown>>(data);
}

export async function fetchReportsVehicles(filters: ReportFilters) {
  const { data } = await apiClient.get("/reports/vehicles", { params: cleanFilters(filters) });
  return unwrap<Record<string, unknown>>(data);
}
