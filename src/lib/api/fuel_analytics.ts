import { apiClient } from "@/lib/api/client";

type UnknownMap = Record<string, unknown>;

export type FuelFundingSource = "cash" | "fuel_card" | "omc_deposit";
export type OmcName = "westport" | "top_oil" | "other";
export type FuelDepositStatus = "draft" | "confirmed" | "cancelled";
export type FuelDepositPaymentMethod = "bank_transfer" | "momo" | "cash" | "cheque";

export interface FuelDeposit {
  id?: number;
  omc_name?: OmcName | string;
  amount?: number | string;
  currency?: string | null;
  deposit_date?: string | null;
  payment_method?: FuelDepositPaymentMethod | string | null;
  reference_no?: string | null;
  status?: FuelDepositStatus | string | null;
  notes?: string | null;
  receipt_url?: string | null;
  created_by_id?: number | null;
  created_by_name?: string | null;
  confirmed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface OmcBalance {
  omc_name?: OmcName | string;
  balance?: number | string;
  currency?: string | null;
  updated_at?: string | null;
}

export interface OmcLedgerEntry {
  id?: number | string;
  entry_date?: string | null;
  created_at?: string | null;
  omc_name?: OmcName | string | null;
  entry_type?: string | null;
  amount?: number | string | null;
  balance_before?: number | string | null;
  balance_after?: number | string | null;
  reference_type?: string | null;
  reference_id?: number | string | null;
  actor_name?: string | null;
  note?: string | null;
}

export interface FuelLogPayload {
  liters: number;
  total_cost: number;
  price_per_liter?: number;
  transaction_date?: string;
  funding_source?: FuelFundingSource;
  omc_name?: OmcName;
}

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

export async function createVehicleFuelLogWithFunding(vehicleId: number, payload: FuelLogPayload) {
  const body = {
    fuel_log: payload,
    ...payload,
  };
  const { data } = await apiClient.post(`/api/v1/vehicles/${vehicleId}/fuel_logs`, body);
  return unwrapObject(data);
}

export async function createTripFuelLogWithFunding(tripId: number, payload: FuelLogPayload) {
  const body = {
    fuel_log: payload,
    ...payload,
  };
  const { data } = await apiClient.post(`/api/v1/trips/${tripId}/fuel_logs`, body);
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

export async function fetchFuelDeposits(
  params: {
    omc_name?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    per_page?: number;
  } = {}
) {
  const { data } = await apiClient.get("/api/v1/fuel/deposits", { params: cleanParams(params) });
  return { raw: asRecord(data), items: unwrapList(data) as unknown as FuelDeposit[] };
}

export async function fetchFuelDeposit(id: number | string) {
  const { data } = await apiClient.get(`/api/v1/fuel/deposits/${id}`);
  return unwrapObject(data) as unknown as FuelDeposit;
}

export async function createFuelDeposit(payload: FormData | UnknownMap) {
  const config = payload instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined;
  const { data } = await apiClient.post("/api/v1/fuel/deposits", payload, config);
  return unwrapObject(data) as unknown as FuelDeposit;
}

export async function updateFuelDeposit(id: number | string, payload: FormData | UnknownMap) {
  const config = payload instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined;
  const { data } = await apiClient.patch(`/api/v1/fuel/deposits/${id}`, payload, config);
  return unwrapObject(data) as unknown as FuelDeposit;
}

export async function confirmFuelDeposit(id: number | string) {
  const { data } = await apiClient.post(`/api/v1/fuel/deposits/${id}/confirm`, {});
  return unwrapObject(data) as unknown as FuelDeposit;
}

export async function fetchOmcBalances() {
  const { data } = await apiClient.get("/api/v1/fuel/omc_balances");
  return { raw: asRecord(data), items: unwrapList(data) as unknown as OmcBalance[] };
}

export async function fetchOmcLedger(
  params: {
    omc_name?: string;
    entry_type?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    per_page?: number;
  } = {}
) {
  const { data } = await apiClient.get("/api/v1/fuel/omc_ledger", { params: cleanParams(params) });
  return { raw: asRecord(data), items: unwrapList(data) as unknown as OmcLedgerEntry[] };
}
