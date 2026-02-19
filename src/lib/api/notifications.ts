import { apiClient } from "@/lib/api/client";

export type NotificationFilters = {
  category?: string;
  type?: string;
  priority?: string;
  read?: "true" | "false" | "";
  group_key?: string;
  page?: number;
  per_page?: number;
};

export type NotificationPreferencePayload = {
  category: string;
  channels: Array<"in_app" | "push" | "sms" | "email">;
  enabled?: boolean;
  min_priority?: string;
};

export type QuietHoursPayload = {
  enabled: boolean;
  start_time: string;
  end_time: string;
  timezone?: string;
};

export type EscalationRulePayload = {
  id?: number | string;
  name: string;
  category?: string;
  type?: string;
  priority?: string;
  channel: "in_app" | "push" | "sms" | "email";
  delay_minutes: number;
  active: boolean;
};

function cleanParams<T extends Record<string, unknown>>(params: T) {
  const entries = Object.entries(params).filter(([, value]) => {
    if (value === undefined || value === null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    return true;
  });
  return Object.fromEntries(entries);
}

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in (payload as Record<string, unknown>)) {
    const dataWrapper = payload as Record<string, unknown>;
    if (Object.keys(dataWrapper).length === 1) {
      return (dataWrapper.data as T) ?? ({} as T);
    }
  }
  return (payload as T) ?? ({} as T);
}

export async function fetchNotifications(filters: NotificationFilters) {
  const { data } = await apiClient.get("/api/v1/notifications", {
    params: cleanParams(filters),
  });
  return unwrap<Record<string, unknown>>(data);
}

export async function fetchNotificationsUnreadCount() {
  const { data } = await apiClient.get("/api/v1/notifications/unread_count");
  return unwrap<Record<string, unknown>>(data);
}

export async function markNotificationRead(id: number | string) {
  try {
    await apiClient.post(`/api/v1/notifications/${id}/mark_read`);
  } catch {
    await apiClient.patch(`/api/v1/notifications/${id}`, { read: true });
  }
}

export async function markAllNotificationsRead() {
  try {
    await apiClient.post("/api/v1/notifications/mark_all_read");
  } catch {
    await apiClient.patch("/api/v1/notifications/mark_all_read");
  }
}

export async function archiveNotification(id: number | string) {
  try {
    await apiClient.post(`/api/v1/notifications/${id}/archive`);
  } catch {
    await apiClient.patch(`/api/v1/notifications/${id}`, { archived: true });
  }
}

export async function deleteNotification(id: number | string) {
  await apiClient.delete(`/api/v1/notifications/${id}`);
}

export async function fetchNotificationPreferences() {
  const { data } = await apiClient.get("/api/v1/notifications/preferences");
  return unwrap<Record<string, unknown>>(data);
}

export async function updateNotificationPreferences(preferences: NotificationPreferencePayload[]) {
  const { data } = await apiClient.put("/api/v1/notifications/preferences", { preferences });
  return unwrap<Record<string, unknown>>(data);
}

export async function updateNotificationQuietHours(payload: QuietHoursPayload) {
  const { data } = await apiClient.put("/api/v1/notifications/preferences/quiet_hours", payload);
  return unwrap<Record<string, unknown>>(data);
}

export async function fetchEscalationRules() {
  const { data } = await apiClient.get("/api/v1/admin/escalation_rules");
  return unwrap<Record<string, unknown>>(data);
}

export async function createEscalationRule(payload: EscalationRulePayload) {
  const { data } = await apiClient.post("/api/v1/admin/escalation_rules", payload);
  return unwrap<Record<string, unknown>>(data);
}

export async function updateEscalationRule(id: number | string, payload: EscalationRulePayload) {
  const { data } = await apiClient.put(`/api/v1/admin/escalation_rules/${id}`, payload);
  return unwrap<Record<string, unknown>>(data);
}

export async function fetchActiveEscalations() {
  const { data } = await apiClient.get("/api/v1/admin/escalations/active");
  return unwrap<Record<string, unknown>>(data);
}
