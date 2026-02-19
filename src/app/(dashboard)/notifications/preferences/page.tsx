"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import NotificationTabs from "@/components/notifications/NotificationTabs";
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  updateNotificationQuietHours,
  type NotificationPreferencePayload,
  type QuietHoursPayload,
} from "@/lib/api/notifications";

type PreferenceRow = {
  category: string;
  channels: Array<"in_app" | "push" | "sms" | "email">;
  enabled: boolean;
  min_priority: string;
};

const ALL_CHANNELS: Array<"in_app" | "push" | "sms" | "email"> = ["in_app", "push", "sms", "email"];

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asList(value: unknown) {
  if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
  const payload = asRecord(value);
  const keys = ["preferences", "data", "items", "user_preferences", "defaults"];
  for (const key of keys) {
    const candidate = payload[key];
    if (Array.isArray(candidate)) return candidate as Array<Record<string, unknown>>;
  }
  return [];
}

function toBool(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return fallback;
}

function normalizeChannels(value: unknown): Array<"in_app" | "push" | "sms" | "email"> {
  if (Array.isArray(value)) {
    return value
      .map((channel) => String(channel))
      .filter((channel): channel is "in_app" | "push" | "sms" | "email" => ALL_CHANNELS.includes(channel as "in_app"))
      .map((channel) => channel as "in_app" | "push" | "sms" | "email");
  }
  const single = String(value ?? "");
  if (ALL_CHANNELS.includes(single as "in_app")) return [single as "in_app" | "push" | "sms" | "email"];
  return ["in_app"];
}

export default function NotificationPreferencesPage() {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<PreferenceRow[]>([]);
  const [quietHours, setQuietHours] = useState<QuietHoursPayload>({
    enabled: false,
    start_time: "22:00",
    end_time: "06:00",
    timezone: "Africa/Accra",
  });

  const preferencesQuery = useQuery({
    queryKey: ["notifications", "preferences"],
    queryFn: fetchNotificationPreferences,
  });

  useEffect(() => {
    const payload = asRecord(preferencesQuery.data);
    const normalizedRows = asList(preferencesQuery.data).map((row) => ({
      category: String(row.category ?? row.key ?? "general"),
      channels: normalizeChannels(row.channels ?? row.channel_preferences),
      enabled: toBool(row.enabled, true),
      min_priority: String(row.min_priority ?? "low"),
    }));
    setRows(normalizedRows);

    const quiet = asRecord(payload.quiet_hours ?? payload.quietHours);
    if (Object.keys(quiet).length > 0) {
      setQuietHours({
        enabled: toBool(quiet.enabled, false),
        start_time: String(quiet.start_time ?? quiet.start ?? "22:00"),
        end_time: String(quiet.end_time ?? quiet.end ?? "06:00"),
        timezone: String(quiet.timezone ?? "Africa/Accra"),
      });
    }
  }, [preferencesQuery.data]);

  const savePreferencesMutation = useMutation({
    mutationFn: (payload: NotificationPreferencePayload[]) => updateNotificationPreferences(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications", "preferences"] });
    },
  });

  const saveQuietHoursMutation = useMutation({
    mutationFn: (payload: QuietHoursPayload) => updateNotificationQuietHours(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications", "preferences"] });
    },
  });

  const categoriesCount = useMemo(() => rows.length, [rows.length]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <p className="ops-section-title">Communication</p>
        <h2 className="text-xl font-semibold text-foreground md:text-2xl">Notification Preferences</h2>
      </div>

      <NotificationTabs />

      <section className="ops-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Configured Categories</p>
            <p className="text-2xl font-bold text-primary">{categoriesCount}</p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-primary/40 bg-primary/15 px-3 py-2 text-sm font-medium text-foreground disabled:opacity-60"
            onClick={() =>
              savePreferencesMutation.mutate(
                rows.map((row) => ({
                  category: row.category,
                  channels: row.channels,
                  enabled: row.enabled,
                  min_priority: row.min_priority,
                }))
              )
            }
            disabled={savePreferencesMutation.isPending || rows.length === 0}
          >
            {savePreferencesMutation.isPending ? "Saving..." : "Save preferences"}
          </button>
        </div>
      </section>

      <section className="ops-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Default + User Preferences</h3>
        {preferencesQuery.isLoading ? <div className="text-sm text-muted-foreground">Loading preferences...</div> : null}
        {preferencesQuery.isError ? <div className="text-sm text-rose-300">Unable to load preferences.</div> : null}
        {!preferencesQuery.isLoading && !preferencesQuery.isError && rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No preference rows returned by backend.</div>
        ) : null}
        {rows.length > 0 ? (
          <div className="space-y-2">
            {rows.map((row, index) => (
              <article key={`${row.category}-${index}`} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{row.category}</p>
                  <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={(event) =>
                        setRows((prev) =>
                          prev.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, enabled: event.target.checked } : item
                          )
                        )
                      }
                    />
                    Enabled
                  </label>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                  <div className="rounded-lg border border-border p-2">
                    <p className="text-xs text-muted-foreground">Channels</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {ALL_CHANNELS.map((channel) => {
                        const active = row.channels.includes(channel);
                        return (
                          <button
                            key={channel}
                            type="button"
                            className={[
                              "rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide",
                              active
                                ? "border-primary/40 bg-primary/15 text-primary"
                                : "border-border text-muted-foreground",
                            ].join(" ")}
                            onClick={() =>
                              setRows((prev) =>
                                prev.map((item, itemIndex) => {
                                  if (itemIndex !== index) return item;
                                  const next = item.channels.includes(channel)
                                    ? item.channels.filter((value) => value !== channel)
                                    : [...item.channels, channel];
                                  return {
                                    ...item,
                                    channels: next.length > 0 ? next : ["in_app"],
                                  };
                                })
                              )
                            }
                          >
                            {channel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-2">
                    <p className="text-xs text-muted-foreground">Minimum Priority</p>
                    <select
                      value={row.min_priority}
                      onChange={(event) =>
                        setRows((prev) =>
                          prev.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, min_priority: event.target.value } : item
                          )
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="ops-card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">Quiet Hours</h3>
          <button
            type="button"
            className="rounded-lg border border-primary/40 bg-primary/15 px-3 py-2 text-sm font-medium text-foreground disabled:opacity-60"
            onClick={() => saveQuietHoursMutation.mutate(quietHours)}
            disabled={saveQuietHoursMutation.isPending}
          >
            {saveQuietHoursMutation.isPending ? "Saving..." : "Save quiet hours"}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <label className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm">
            <input
              type="checkbox"
              checked={quietHours.enabled}
              onChange={(event) => setQuietHours((prev) => ({ ...prev, enabled: event.target.checked }))}
            />
            Enabled
          </label>
          <input
            type="time"
            value={quietHours.start_time}
            onChange={(event) => setQuietHours((prev) => ({ ...prev, start_time: event.target.value }))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            type="time"
            value={quietHours.end_time}
            onChange={(event) => setQuietHours((prev) => ({ ...prev, end_time: event.target.value }))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={quietHours.timezone ?? ""}
            onChange={(event) => setQuietHours((prev) => ({ ...prev, timezone: event.target.value }))}
            placeholder="Timezone"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
        </div>
      </section>
    </div>
  );
}
