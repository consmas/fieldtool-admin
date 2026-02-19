import { apiClient } from "@/lib/api/client";

type UnknownMap = Record<string, unknown>;

function cleanParams(params: UnknownMap) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

function unwrapArray<T = UnknownMap>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const payload = data as UnknownMap;
    if (Array.isArray(payload.data)) return payload.data as T[];
    if (Array.isArray(payload.items)) return payload.items as T[];
    if (Array.isArray(payload.results)) return payload.results as T[];
  }
  return [];
}

function unwrapObject<T = UnknownMap>(data: unknown): T {
  if (data && typeof data === "object") {
    const payload = data as UnknownMap;
    if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
      return payload.data as T;
    }
    return data as T;
  }
  return {} as T;
}

export async function fetchDueMaintenance(params: {
  priority?: string;
  vehicle_id?: number;
  overdue_only?: boolean;
}) {
  const { data } = await apiClient.get("/api/v1/maintenance/due", { params: cleanParams(params) });
  return unwrapArray(data);
}

export async function fetchWorkOrders(params: {
  page?: number;
  per_page?: number;
  q?: string;
  status?: string;
  priority?: string;
  vehicle_id?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}) {
  const { data } = await apiClient.get("/api/v1/work_orders", { params: cleanParams(params) });
  return data as UnknownMap;
}

export async function fetchWorkOrder(id: number) {
  const { data } = await apiClient.get(`/api/v1/work_orders/${id}`);
  return unwrapObject(data);
}

export async function createWorkOrder(payload: UnknownMap) {
  const { data } = await apiClient.post("/api/v1/work_orders", payload);
  return unwrapObject(data);
}

export async function updateWorkOrder(id: number, payload: UnknownMap) {
  const { data } = await apiClient.patch(`/api/v1/work_orders/${id}`, payload);
  return unwrapObject(data);
}

export async function updateWorkOrderStatus(id: number, payload: UnknownMap) {
  const { data } = await apiClient.patch(`/api/v1/work_orders/${id}/status`, payload);
  return unwrapObject(data);
}

export async function addWorkOrderPart(workOrderId: number, payload: UnknownMap) {
  const { data } = await apiClient.post(`/api/v1/work_orders/${workOrderId}/parts`, payload);
  return unwrapObject(data);
}

export async function updateWorkOrderPart(workOrderId: number, partId: number, payload: UnknownMap) {
  const { data } = await apiClient.patch(`/api/v1/work_orders/${workOrderId}/parts/${partId}`, payload);
  return unwrapObject(data);
}

export async function deleteWorkOrderPart(workOrderId: number, partId: number) {
  const { data } = await apiClient.delete(`/api/v1/work_orders/${workOrderId}/parts/${partId}`);
  return data;
}

export async function addWorkOrderComment(workOrderId: number, payload: UnknownMap) {
  const { data } = await apiClient.post(`/api/v1/work_orders/${workOrderId}/comments`, payload);
  return unwrapObject(data);
}

export async function fetchVendors(params: { page?: number; q?: string } = {}) {
  const { data } = await apiClient.get("/api/v1/maintenance/vendors", { params: cleanParams(params) });
  return data as UnknownMap;
}

export async function createVendor(payload: UnknownMap) {
  const { data } = await apiClient.post("/api/v1/maintenance/vendors", payload);
  return unwrapObject(data);
}

export async function updateVendor(id: number, payload: UnknownMap) {
  const { data } = await apiClient.patch(`/api/v1/maintenance/vendors/${id}`, payload);
  return unwrapObject(data);
}

export async function deleteVendor(id: number) {
  const { data } = await apiClient.delete(`/api/v1/maintenance/vendors/${id}`);
  return data;
}

export async function fetchVehicleDocuments(vehicleId: number) {
  const { data } = await apiClient.get(`/api/v1/vehicles/${vehicleId}/documents`);
  return unwrapArray(data);
}

export async function createVehicleDocument(vehicleId: number, payload: UnknownMap | FormData) {
  const config = payload instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined;
  const { data } = await apiClient.post(`/api/v1/vehicles/${vehicleId}/documents`, payload, config);
  return unwrapObject(data);
}

export async function updateVehicleDocument(vehicleId: number, documentId: number, payload: UnknownMap | FormData) {
  const config = payload instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined;
  const { data } = await apiClient.patch(`/api/v1/vehicles/${vehicleId}/documents/${documentId}`, payload, config);
  return unwrapObject(data);
}

export async function fetchExpiringDocuments(params: { days?: number } = {}) {
  const { data } = await apiClient.get("/api/v1/documents/expiring", { params: cleanParams(params) });
  return unwrapArray(data);
}

export async function fetchMaintenanceReport(params: UnknownMap = {}) {
  const { data } = await apiClient.get("/api/v1/reports/maintenance", { params: cleanParams(params) });
  return unwrapObject(data);
}

export async function fetchVehicleMaintenanceHistory(vehicleId: number, params: UnknownMap = {}) {
  const { data } = await apiClient.get(`/api/v1/reports/vehicles/${vehicleId}/maintenance_history`, {
    params: cleanParams(params),
  });
  return unwrapObject(data);
}

export async function createMaintenanceScheduleTemplate(payload: UnknownMap) {
  const { data } = await apiClient.post("/api/v1/maintenance_schedules/templates", payload);
  return unwrapObject(data);
}

export async function fetchMaintenanceScheduleTemplates(params: UnknownMap = {}) {
  const { data } = await apiClient.get("/api/v1/maintenance_schedules/templates", {
    params: cleanParams(params),
  });
  return data as UnknownMap;
}

export async function fetchMaintenanceSchedules(params: UnknownMap = {}) {
  const { data } = await apiClient.get("/api/v1/maintenance_schedules", {
    params: cleanParams(params),
  });
  return data as UnknownMap;
}

export async function updateMaintenanceScheduleTemplate(templateId: number | string, payload: UnknownMap) {
  try {
    const { data } = await apiClient.patch(`/api/v1/maintenance_schedules/templates/${templateId}`, payload);
    return unwrapObject(data);
  } catch {
    const { data } = await apiClient.patch(`/api/v1/maintenance_schedules/${templateId}`, payload);
    return unwrapObject(data);
  }
}

export async function deleteMaintenanceScheduleTemplate(templateId: number | string) {
  try {
    const { data } = await apiClient.delete(`/api/v1/maintenance_schedules/templates/${templateId}`);
    return data;
  } catch {
    const { data } = await apiClient.delete(`/api/v1/maintenance_schedules/${templateId}`);
    return data;
  }
}
