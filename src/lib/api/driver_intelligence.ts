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

function asList(value: unknown): UnknownMap[] {
  if (Array.isArray(value)) return value as UnknownMap[];
  const payload = asRecord(value);
  const keys = ["data", "items", "results", "drivers", "documents", "leaderboard", "history", "events"];
  for (const key of keys) {
    const candidate = payload[key];
    if (Array.isArray(candidate)) return candidate as UnknownMap[];
  }
  return [];
}

async function tryGet(urls: string[], params?: UnknownMap) {
  let lastError: unknown = null;
  for (const url of urls) {
    try {
      const { data } = await apiClient.get(url, { params: params ? cleanParams(params) : undefined });
      return data;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function fetchDrivers(params: UnknownMap = {}) {
  const { data } = await apiClient.get("/api/v1/drivers", { params: cleanParams(params) });
  return asList(data);
}

export async function fetchDriversLeaderboard(params: UnknownMap = {}) {
  const { data } = await apiClient.get("/api/v1/drivers/leaderboard", {
    params: cleanParams(params),
  });
  return asList(data);
}

export async function fetchDriver(driverId: number | string) {
  const { data } = await apiClient.get(`/api/v1/drivers/${driverId}`);
  return asRecord(data);
}

export async function fetchDriverScores(driverId: number | string, params: UnknownMap = {}) {
  const { data } = await apiClient.get(`/api/v1/drivers/${driverId}/scores`, {
    params: cleanParams(params),
  });
  return asList(data);
}

export async function fetchDriverCurrentScore(driverId: number | string) {
  const { data } = await apiClient.get(`/api/v1/drivers/${driverId}/scores/current`);
  return asRecord(data);
}

export async function fetchDriverBadges(driverId: number | string) {
  const { data } = await apiClient.get(`/api/v1/drivers/${driverId}/badges`);
  return asList(data);
}

export async function fetchDriverDocuments(driverId: number | string, params: UnknownMap = {}) {
  const { data } = await apiClient.get(`/api/v1/drivers/${driverId}/documents`, {
    params: cleanParams(params),
  });
  return asList(data);
}

export async function createDriverDocument(driverId: number | string, payload: UnknownMap | FormData) {
  const config = payload instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined;
  const { data } = await apiClient.post(`/api/v1/drivers/${driverId}/documents`, payload, config);
  return asRecord(data);
}

export async function updateDriverDocument(
  driverId: number | string,
  documentId: number | string,
  payload: UnknownMap | FormData
) {
  const config = payload instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined;
  const { data } = await apiClient.patch(`/api/v1/drivers/${driverId}/documents/${documentId}`, payload, config);
  return asRecord(data);
}

export async function verifyDriverDocument(
  driverId: number | string,
  documentId: number | string,
  payload: UnknownMap
) {
  const { data } = await apiClient.patch(`/api/v1/drivers/${driverId}/documents/${documentId}/verify`, payload);
  return asRecord(data);
}

export async function fetchExpiringDriverDocuments(params: UnknownMap = {}) {
  const { data } = await apiClient.get("/api/v1/drivers/documents/expiring", {
    params: cleanParams(params),
  });
  return asList(data);
}

export async function fetchDriverComplianceSummary() {
  const { data } = await apiClient.get("/api/v1/drivers/documents/compliance_summary");
  return asRecord(data);
}

export async function fetchDriverReport(params: UnknownMap = {}) {
  const { data } = await apiClient.get("/api/v1/reports/drivers", { params: cleanParams(params) });
  return asRecord(data);
}

export async function fetchFuelDriverTrend(driverId: number | string) {
  const { data } = await apiClient.get(`/api/v1/fuel/analysis/driver/${driverId}`);
  return asRecord(data);
}

export async function fetchFuelAnomalies(params: UnknownMap = {}) {
  const { data } = await apiClient.get("/api/v1/fuel/anomalies", { params: cleanParams(params) });
  return asList(data);
}

export async function fetchScoringConfig() {
  const { data } = await apiClient.get("/api/v1/admin/scoring_config");
  return asRecord(data);
}

export async function updateScoringConfig(payload: UnknownMap) {
  const { data } = await apiClient.patch("/api/v1/admin/scoring_config", payload);
  return asRecord(data);
}

export async function fetchAuditTrail(params: UnknownMap = {}) {
  const data = await tryGet(
    ["/api/v1/admin/audit_trail", "/api/v1/admin/audit_logs", "/api/v1/action_history"],
    params
  );
  return { raw: asRecord(data), items: asList(data) };
}

export async function fetchComplianceNotifications() {
  const data = await tryGet(["/api/v1/notifications", "/notifications"], {
    category: "compliance",
    per_page: 20,
  });
  return asList(data);
}
