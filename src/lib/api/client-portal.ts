import axios from "axios";
import { useClientAuthStore } from "@/stores/client-auth.store";

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

const clientPortalApi = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

clientPortalApi.interceptors.request.use((config) => {
  let token = useClientAuthStore.getState().token;
  if (!token && typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem("consmas-client-auth");
      const parsed = raw ? (JSON.parse(raw) as { state?: { token?: string } }) : null;
      token = parsed?.state?.token ?? null;
    } catch {
      token = null;
    }
  }
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function cleanParams<T extends Record<string, unknown>>(params: T) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === "string") return value.trim().length > 0;
      return true;
    })
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asList(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
  const payload = asRecord(value);
  const keys = ["data", "items", "results", "shipments", "invoices", "events"];
  for (const key of keys) {
    const candidate = payload[key];
    if (Array.isArray(candidate)) return candidate as Array<Record<string, unknown>>;
  }
  return [];
}

async function tryPost<T = Record<string, unknown>>(urls: string[], payload: Record<string, unknown>) {
  let lastError: unknown = null;
  for (const url of urls) {
    try {
      const response = await clientPortalApi.post<T>(url, payload);
      return response;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function clientLogin(payload: { email: string; password: string }) {
  const response = await tryPost(
    ["/api/v1/client/login", "/api/v1/client/auth/login"],
    { user: payload, ...payload }
  );
  const data = response.data as Record<string, unknown>;
  const authHeader = response.headers["authorization"] as string | undefined;
  const headerToken = authHeader?.replace("Bearer ", "") ?? null;
  const token =
    headerToken ??
    (data.token as string | undefined) ??
    (data.access_token as string | undefined) ??
    (asRecord(data.data).token as string | undefined) ??
    null;
  const user = (data.user as Record<string, unknown> | undefined) ?? asRecord(data.data).user;
  return { token, user: user ?? null };
}

export async function clientLogout() {
  try {
    await clientPortalApi.post("/api/v1/client/logout");
  } catch {
    // Logout endpoint may be optional; local session clear is sufficient.
  }
}

export async function fetchClientDashboard() {
  const { data } = await clientPortalApi.get("/api/v1/client/dashboard");
  return asRecord(data);
}

export async function fetchClientShipments(params: Record<string, unknown> = {}) {
  const { data } = await clientPortalApi.get("/api/v1/client/shipments", {
    params: cleanParams(params),
  });
  return { raw: asRecord(data), items: asList(data) };
}

export async function fetchClientShipmentDetail(trackingNumber: string) {
  const { data } = await clientPortalApi.get(`/api/v1/client/shipments/${trackingNumber}`);
  return asRecord(data);
}

export async function fetchClientShipmentTrack(trackingNumber: string) {
  const { data } = await clientPortalApi.get(`/api/v1/client/shipments/${trackingNumber}/track`);
  return asRecord(data);
}

export async function fetchClientShipmentEvents(trackingNumber: string) {
  const { data } = await clientPortalApi.get(`/api/v1/client/shipments/${trackingNumber}/events`);
  return { raw: asRecord(data), items: asList(data) };
}

export async function fetchClientShipmentPod(trackingNumber: string) {
  const { data } = await clientPortalApi.get(`/api/v1/client/shipments/${trackingNumber}/pod`);
  return asRecord(data);
}

export async function submitClientShipmentFeedback(
  trackingNumber: string,
  payload: { rating?: number; comment?: string; feedback?: string }
) {
  const { data } = await clientPortalApi.post(
    `/api/v1/client/shipments/${trackingNumber}/feedback`,
    payload
  );
  return asRecord(data);
}

export async function fetchClientInvoices(params: Record<string, unknown> = {}) {
  const { data } = await clientPortalApi.get("/api/v1/client/invoices", {
    params: cleanParams(params),
  });
  return { raw: asRecord(data), items: asList(data) };
}

export async function fetchClientInvoiceDetail(invoiceId: string | number) {
  const { data } = await clientPortalApi.get(`/api/v1/client/invoices/${invoiceId}`);
  return asRecord(data);
}

export async function fetchClientBillingSummary() {
  const { data } = await clientPortalApi.get("/api/v1/client/billing/summary");
  return asRecord(data);
}

export async function fetchClientProfile() {
  const { data } = await clientPortalApi.get("/api/v1/client/profile");
  return asRecord(data);
}

export async function updateClientPreferences(payload: Record<string, unknown>) {
  const { data } = await clientPortalApi.put("/api/v1/client/profile/preferences", payload);
  return asRecord(data);
}

export async function changeClientPassword(payload: {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}) {
  const { data } = await clientPortalApi.put("/api/v1/client/profile/password", payload);
  return asRecord(data);
}
