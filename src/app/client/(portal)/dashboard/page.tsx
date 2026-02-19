"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchClientDashboard } from "@/lib/api/client-portal";

function asNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asList(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
  const payload = asRecord(value);
  const keys = ["data", "items", "shipments", "recent_shipments", "upcoming_shipments"];
  for (const key of keys) {
    const candidate = payload[key];
    if (Array.isArray(candidate)) return candidate as Array<Record<string, unknown>>;
  }
  return [];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="ops-card p-4">
      <p className="ops-section-title">{label}</p>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
    </article>
  );
}

export default function ClientDashboardPage() {
  const dashboardQuery = useQuery({
    queryKey: ["client", "dashboard"],
    queryFn: fetchClientDashboard,
  });

  const metrics = useMemo(() => {
    const data = asRecord(dashboardQuery.data);
    return {
      activeShipments: asNumber(data.active_shipments ?? data.active ?? asRecord(data.shipments).active),
      inTransit: asNumber(data.in_transit ?? asRecord(data.shipments).in_transit),
      deliveredMonth: asNumber(data.delivered_this_month ?? asRecord(data.shipments).delivered_this_month),
      outstandingBalance: asNumber(data.outstanding_balance ?? asRecord(data.billing).outstanding_balance),
    };
  }, [dashboardQuery.data]);

  const recentShipments = useMemo(() => {
    const data = asRecord(dashboardQuery.data);
    return asList(data.recent_shipments);
  }, [dashboardQuery.data]);

  const upcomingShipments = useMemo(() => {
    const data = asRecord(dashboardQuery.data);
    return asList(data.upcoming_shipments);
  }, [dashboardQuery.data]);

  return (
    <div className="space-y-4 md:space-y-6">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Active Shipments" value={String(metrics.activeShipments)} />
        <KpiCard label="In Transit" value={String(metrics.inTransit)} />
        <KpiCard label="Delivered This Month" value={String(metrics.deliveredMonth)} />
        <KpiCard label="Outstanding Balance" value={formatCurrency(metrics.outstandingBalance)} />
      </section>

      {dashboardQuery.isLoading ? <div className="ops-card p-6 text-sm text-muted-foreground">Loading dashboard...</div> : null}
      {dashboardQuery.isError ? <div className="ops-card p-6 text-sm text-rose-300">Unable to load dashboard data.</div> : null}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="ops-card p-4">
          <h3 className="text-sm font-semibold text-foreground">Recent Shipments</h3>
          {recentShipments.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No recent shipments.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {recentShipments.map((row, index) => (
                <div key={index} className="rounded-lg border border-border p-3 text-sm">
                  <p className="font-semibold text-foreground">{String(row.tracking_number ?? row.reference ?? "Shipment")}</p>
                  <p className="text-xs text-muted-foreground">
                    {String(row.origin ?? "-")} → {String(row.destination ?? "-")} · {String(row.status ?? "-")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="ops-card p-4">
          <h3 className="text-sm font-semibold text-foreground">Upcoming Shipments</h3>
          {upcomingShipments.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No upcoming shipments.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {upcomingShipments.map((row, index) => (
                <div key={index} className="rounded-lg border border-border p-3 text-sm">
                  <p className="font-semibold text-foreground">{String(row.tracking_number ?? row.reference ?? "Shipment")}</p>
                  <p className="text-xs text-muted-foreground">
                    ETA: {String(row.eta ?? row.expected_delivery ?? "-")} · {String(row.status ?? "-")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
