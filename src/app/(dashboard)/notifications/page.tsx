"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import NotificationTabs from "@/components/notifications/NotificationTabs";
import {
  archiveNotification,
  deleteNotification,
  fetchNotifications,
  fetchNotificationsUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationFilters,
} from "@/lib/api/notifications";

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asList(value: unknown) {
  if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
  const payload = asRecord(value);
  const keys = ["data", "items", "results", "notifications"];
  for (const key of keys) {
    const candidate = payload[key];
    if (Array.isArray(candidate)) return candidate as Array<Record<string, unknown>>;
  }
  return [];
}

function getPriorityTone(priority: string) {
  const normalized = priority.toLowerCase();
  if (normalized === "critical") return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  if (normalized === "high") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
}

function getReadState(row: Record<string, unknown>) {
  if (typeof row.read === "boolean") return row.read;
  if (typeof row.is_read === "boolean") return row.is_read;
  return false;
}

function ChannelChip({ channel }: { channel: string }) {
  return (
    <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
      {channel}
    </span>
  );
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<NotificationFilters>({
    category: "",
    type: "",
    priority: "",
    read: "",
    group_key: "",
  });

  const notificationsQuery = useQuery({
    queryKey: ["notifications", "list", filters],
    queryFn: () => fetchNotifications(filters),
  });

  const unreadQuery = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: fetchNotificationsUnreadCount,
    refetchInterval: 20_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number | string) => markNotificationRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number | string) => archiveNotification(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => deleteNotification(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const rows = useMemo(() => asList(notificationsQuery.data), [notificationsQuery.data]);
  const unreadCount =
    Number(
      asRecord(unreadQuery.data).unread_count ??
        asRecord(unreadQuery.data).count ??
        0
    ) || 0;

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <p className="ops-section-title">Communication</p>
        <h2 className="text-xl font-semibold text-foreground md:text-2xl">Notification Control Center</h2>
      </div>

      <NotificationTabs />

      <section className="ops-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Unread Notifications</p>
            <p className="text-2xl font-bold text-primary">{unreadCount}</p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-primary/40 bg-primary/15 px-3 py-2 text-sm font-medium text-foreground disabled:opacity-60"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            {markAllReadMutation.isPending ? "Marking..." : "Mark all read"}
          </button>
        </div>
      </section>

      <section className="ops-card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <input
            value={filters.category ?? ""}
            onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}
            placeholder="Category"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={filters.type ?? ""}
            onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))}
            placeholder="Type"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <select
            value={filters.priority ?? ""}
            onChange={(event) => setFilters((prev) => ({ ...prev, priority: event.target.value }))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="">All priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={filters.read ?? ""}
            onChange={(event) => setFilters((prev) => ({ ...prev, read: event.target.value as NotificationFilters["read"] }))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="">All status</option>
            <option value="false">Unread</option>
            <option value="true">Read</option>
          </select>
          <input
            value={filters.group_key ?? ""}
            onChange={(event) => setFilters((prev) => ({ ...prev, group_key: event.target.value }))}
            placeholder="Group key"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
        </div>
      </section>

      <section className="ops-card overflow-hidden">
        {notificationsQuery.isLoading ? <div className="p-6 text-sm text-muted-foreground">Loading notifications...</div> : null}
        {notificationsQuery.isError ? <div className="p-6 text-sm text-rose-300">Unable to load notifications.</div> : null}
        {!notificationsQuery.isLoading && !notificationsQuery.isError && rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No notifications for selected filters.</div>
        ) : null}
        {rows.length > 0 ? (
          <div className="divide-y divide-border">
            {rows.map((row, index) => {
              const id = row.id ?? row.notification_id ?? index;
              const read = getReadState(row);
              const priority = String(row.priority ?? "medium");
              const channelsRaw = row.channels;
              const channels = Array.isArray(channelsRaw)
                ? channelsRaw.map((value) => String(value))
                : String(channelsRaw ?? "")
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean);
              return (
                <article key={String(id)} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{String(row.title ?? row.subject ?? "Notification")}</p>
                        <span className={["rounded-full border px-2 py-0.5 text-[11px] font-semibold", getPriorityTone(priority)].join(" ")}>
                          {priority}
                        </span>
                        <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                          {read ? "Read" : "Unread"}
                        </span>
                        {row.group_key ? (
                          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                            Group: {String(row.group_key)}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">{String(row.message ?? row.body ?? "-")}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {channels.length > 0
                          ? channels.map((channel) => <ChannelChip key={`${id}-${channel}`} channel={channel} />)
                          : ["in_app"].map((channel) => <ChannelChip key={`${id}-${channel}`} channel={channel} />)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {String(row.category ?? "general")} · {String(row.type ?? "event")} ·{" "}
                        {String(row.created_at ?? row.timestamp ?? "-")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!read ? (
                        <button
                          type="button"
                          className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-foreground"
                          onClick={() => markReadMutation.mutate(id as string | number)}
                          disabled={markReadMutation.isPending}
                        >
                          Mark read
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-300"
                        onClick={() => archiveMutation.mutate(id as string | number)}
                        disabled={archiveMutation.isPending}
                      >
                        Archive
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-300"
                        onClick={() => deleteMutation.mutate(id as string | number)}
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </div>
  );
}
