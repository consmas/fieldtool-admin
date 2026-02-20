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
  const keys = ["data", "items", "results", "violations", "incidents", "requirements", "claims"];
  for (const key of keys) {
    const candidate = payload[key];
    if (Array.isArray(candidate)) return candidate as UnknownMap[];
  }
  return [];
}

export async function fetchComplianceDashboard(params: UnknownMap = {}) {
  const { data } = await apiClient.get("/api/v1/compliance/dashboard", {
    params: cleanParams(params),
  });
  return asRecord(data);
}

export async function fetchIncidentDashboard(params: UnknownMap = {}) {
  const { data } = await apiClient.get("/api/v1/incidents/dashboard", {
    params: cleanParams(params),
  });
  return asRecord(data);
}

export async function fetchComplianceRequirements(params: UnknownMap = {}) {
  const { data } = await apiClient.get("/api/v1/compliance/requirements", {
    params: cleanParams(params),
  });
  return asList(data);
}

export async function createComplianceRequirement(payload: UnknownMap) {
  const { data } = await apiClient.post("/api/v1/compliance/requirements", payload);
  return asRecord(data);
}

export async function updateComplianceRequirement(id: number | string, payload: UnknownMap) {
  const { data } = await apiClient.patch(`/api/v1/compliance/requirements/${id}`, payload);
  return asRecord(data);
}

export async function verifyTripCompliance(tripId: number | string) {
  const { data } = await apiClient.post(`/api/v1/trips/${tripId}/compliance/verify`);
  return asRecord(data);
}

export async function fetchComplianceViolations(params: UnknownMap = {}) {
  const { data } = await apiClient.get("/api/v1/compliance/violations", {
    params: cleanParams(params),
  });
  return asList(data);
}

export async function fetchComplianceViolation(id: number | string) {
  const { data } = await apiClient.get(`/api/v1/compliance/violations/${id}`);
  return asRecord(data);
}

export async function updateComplianceViolation(id: number | string, payload: UnknownMap) {
  const { data } = await apiClient.patch(`/api/v1/compliance/violations/${id}`, payload);
  return asRecord(data);
}

export async function createViolationWaiver(id: number | string, payload: UnknownMap) {
  const { data } = await apiClient.post(`/api/v1/compliance/violations/${id}/waiver`, payload);
  return asRecord(data);
}

export async function fetchVehicleCompliance(vehicleId: number | string) {
  const { data } = await apiClient.get(`/api/v1/compliance/vehicle/${vehicleId}`);
  return asRecord(data);
}

export async function fetchDriverCompliance(driverId: number | string) {
  const { data } = await apiClient.get(`/api/v1/compliance/driver/${driverId}`);
  return asRecord(data);
}

export async function fetchIncidents(params: UnknownMap = {}) {
  const { data } = await apiClient.get("/api/v1/incidents", { params: cleanParams(params) });
  return asList(data);
}

export async function fetchIncident(id: number | string) {
  const { data } = await apiClient.get(`/api/v1/incidents/${id}`);
  return asRecord(data);
}

export async function updateIncidentStatus(id: number | string, payload: UnknownMap) {
  const { data } = await apiClient.patch(`/api/v1/incidents/${id}/status`, payload);
  return asRecord(data);
}

export async function createInsuranceClaim(incidentId: number | string, payload: UnknownMap) {
  const { data } = await apiClient.post(`/api/v1/incidents/${incidentId}/insurance_claims`, payload);
  return asRecord(data);
}

export async function updateInsuranceClaim(
  incidentId: number | string,
  claimId: number | string,
  payload: UnknownMap
) {
  const { data } = await apiClient.patch(`/api/v1/incidents/${incidentId}/insurance_claims/${claimId}`, payload);
  return asRecord(data);
}

export async function fetchIncidentReport(params: UnknownMap = {}) {
  const { data } = await apiClient.get("/api/v1/reports/incidents", {
    params: cleanParams(params),
  });
  return asRecord(data);
}

export async function fetchComplianceReport(params: UnknownMap = {}) {
  const { data } = await apiClient.get("/api/v1/reports/compliance", {
    params: cleanParams(params),
  });
  return asRecord(data);
}

export async function fetchAuditLogs(params: UnknownMap = {}) {
  const { data } = await apiClient.get("/api/v1/audit/logs", { params: cleanParams(params) });
  return { raw: asRecord(data), items: asList(data) };
}

export async function fetchAuditSummary(params: UnknownMap = {}) {
  const { data } = await apiClient.get("/api/v1/audit/summary", {
    params: cleanParams(params),
  });
  return asRecord(data);
}

export async function fetchAuditResourceHistory(resourceType: string, resourceId: number | string, params: UnknownMap = {}) {
  const { data } = await apiClient.get(`/api/v1/audit/logs/${resourceType}/${resourceId}`, {
    params: cleanParams(params),
  });
  return { raw: asRecord(data), items: asList(data) };
}

export async function fetchAuditUserHistory(userId: number | string, params: UnknownMap = {}) {
  const { data } = await apiClient.get(`/api/v1/audit/logs/user/${userId}`, {
    params: cleanParams(params),
  });
  return { raw: asRecord(data), items: asList(data) };
}
