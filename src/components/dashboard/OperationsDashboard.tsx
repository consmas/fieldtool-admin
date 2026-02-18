"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Clock3, Fuel, MapPin, Route, Truck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchTrips } from "@/lib/api/trips";
import type { Trip } from "@/types/api";
import TripStatusBadge from "@/components/trips/TripStatusBadge";
import { formatDate } from "@/lib/utils/format";

type AlertTone = "danger" | "warning" | "info";

type DashboardAlert = {
  id: string;
  tone: AlertTone;
  tripId: number;
  tripRef: string;
  title: string;
  detail: string;
};

function parseDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function calcDistanceKm(trip: Trip) {
  const start = trip.start_odometer_km;
  const end = trip.end_odometer_km;
  if (typeof start !== "number" || typeof end !== "number") return 0;
  const delta = end - start;
  return Number.isFinite(delta) && delta > 0 ? delta : 0;
}

function buildAlert(trip: Trip): DashboardAlert | null {
  const ref = trip.waybill_number ?? trip.reference_code ?? `Trip ${trip.id}`;
  const status = (trip.status ?? "").toLowerCase();

  if (["blocked", "cancelled"].includes(status)) {
    return {
      id: `blocked-${trip.id}`,
      tone: "danger",
      tripId: trip.id,
      tripRef: ref,
      title: "Trip blocked",
      detail: "Requires manual intervention before movement.",
    };
  }

  if (["delayed"].includes(status)) {
    return {
      id: `delayed-${trip.id}`,
      tone: "warning",
      tripId: trip.id,
      tripRef: ref,
      title: "Trip delayed",
      detail: "ETA has drifted from schedule.",
    };
  }

  const pickup = parseDate(trip.scheduled_pickup_at ?? trip.trip_date);
  if (pickup) {
    const now = new Date();
    const mins = Math.floor((pickup.getTime() - now.getTime()) / 60000);
    if (mins <= 30 && mins >= -30 && ["planned", "scheduled", "assigned"].includes(status)) {
      return {
        id: `pending-departure-${trip.id}`,
        tone: "info",
        tripId: trip.id,
        tripRef: ref,
        title: "Upcoming departure",
        detail: `Scheduled within ${Math.abs(mins)} minutes.`,
      };
    }
  }

  return null;
}

function toneClasses(tone: AlertTone) {
  if (tone === "danger") return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  if (tone === "warning") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  return "border-indigo-500/30 bg-indigo-500/10 text-indigo-300";
}

function kpiAccent(type: "active" | "alerts" | "ontime" | "pending") {
  if (type === "active") return "border-sky-500/40 text-sky-300";
  if (type === "alerts") return "border-rose-500/40 text-rose-300";
  if (type === "ontime") return "border-emerald-500/40 text-emerald-300";
  return "border-indigo-500/40 text-indigo-300";
}

export default function OperationsDashboard() {
  const { data: trips = [], isLoading, isError } = useQuery({
    queryKey: ["trips", "dashboard-v2"],
    queryFn: fetchTrips,
    refetchInterval: 30_000,
  });

  const summary = useMemo(() => {
    const activeStatuses = new Set(["assigned", "loaded", "en_route", "arrived", "offloaded", "in_progress", "in_transit", "delayed"]);

    let active = 0;
    let completedToday = 0;
    let onTimeCount = 0;
    let withEtaCount = 0;
    let totalFuel = 0;
    let pendingInspections = 0;

    const today = new Date();

    trips.forEach((trip) => {
      const status = (trip.status ?? "").toLowerCase();
      if (activeStatuses.has(status)) active += 1;

      const completed = parseDate(trip.completed_at);
      if (completed && sameDay(completed, today)) completedToday += 1;

      const sched = parseDate(trip.scheduled_pickup_at ?? trip.trip_date);
      const finished = parseDate(trip.completed_at ?? trip.arrival_time_at_site ?? trip.return_time);
      if (sched && finished) {
        withEtaCount += 1;
        if (finished.getTime() <= sched.getTime() + 90 * 60000) onTimeCount += 1;
      }

      totalFuel += Number(trip.fuel_allocated_litres ?? 0) || 0;

      if (status === "planned" || status === "scheduled" || status === "assigned") {
        pendingInspections += 1;
      }
    });

    const onTimeRate = withEtaCount ? Math.round((onTimeCount / withEtaCount) * 100) : 0;

    return {
      active,
      completedToday,
      onTimeRate,
      pendingInspections,
      totalFuel,
      totalDistance: trips.reduce((sum, t) => sum + calcDistanceKm(t), 0),
    };
  }, [trips]);

  const alerts = useMemo(() => trips.map(buildAlert).filter(Boolean).slice(0, 8) as DashboardAlert[], [trips]);

  const mapTrips = useMemo(() => {
    const points = trips
      .filter((t) => t.latest_location?.lat !== undefined && t.latest_location?.lng !== undefined)
      .map((t) => ({
        id: t.id,
        ref: t.waybill_number ?? t.reference_code ?? `Trip ${t.id}`,
        status: (t.status ?? "").toLowerCase(),
        lat: t.latest_location!.lat,
        lng: t.latest_location!.lng,
      }));

    if (points.length === 0) return [];

    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    const latMin = Math.min(...lats);
    const latMax = Math.max(...lats);
    const lngMin = Math.min(...lngs);
    const lngMax = Math.max(...lngs);

    return points.map((p) => ({
      ...p,
      x: lngMax === lngMin ? 50 : 12 + ((p.lng - lngMin) / (lngMax - lngMin)) * 76,
      y: latMax === latMin ? 50 : 12 + ((latMax - p.lat) / (latMax - latMin)) * 76,
    }));
  }, [trips]);

  const recentTrips = useMemo(
    () => [...trips].sort((a, b) => (new Date(b.scheduled_pickup_at ?? b.trip_date ?? 0).getTime() - new Date(a.scheduled_pickup_at ?? a.trip_date ?? 0).getTime())).slice(0, 10),
    [trips]
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Active Trips" value={summary.active} helper={`${summary.completedToday} completed today`} icon={<Truck className="h-4 w-4" />} accent="active" />
        <KpiCard label="Critical Alerts" value={alerts.filter((a) => a.tone === "danger").length} helper={`${alerts.length} total feed items`} icon={<AlertTriangle className="h-4 w-4" />} accent="alerts" />
        <KpiCard label="On-Time Rate" value={`${summary.onTimeRate}%`} helper="Compared with schedule" icon={<Clock3 className="h-4 w-4" />} accent="ontime" />
        <KpiCard label="Pending Inspections" value={summary.pendingInspections} helper={`${summary.totalFuel.toFixed(0)}L allocated`} icon={<CheckCircle2 className="h-4 w-4" />} accent="pending" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="ops-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Alert Feed</h3>
            <Link href="/logistics" className="text-xs text-primary hover:underline">
              Open Logistics
            </Link>
          </div>
          <div className="max-h-[360px] space-y-2 overflow-y-auto p-3">
            {isLoading ? <p className="text-sm text-muted-foreground">Loading alerts...</p> : null}
            {!isLoading && alerts.length === 0 ? <p className="text-sm text-muted-foreground">No active alerts.</p> : null}
            {alerts.map((a) => (
              <Link
                key={a.id}
                href={`/trips/${a.tripId}`}
                className={[
                  "block rounded-md border p-3 transition",
                  toneClasses(a.tone),
                  "hover:opacity-90",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-xs font-bold">{a.tripRef}</p>
                  <span className="text-[10px] uppercase">{a.tone}</span>
                </div>
                <p className="mt-1 text-sm font-semibold">{a.title}</p>
                <p className="mt-1 text-xs opacity-90">{a.detail}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="ops-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Active Trips Map</h3>
            <span className="text-xs text-muted-foreground">{mapTrips.length} live points</span>
          </div>

          <div className="relative min-h-[320px] bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.12),transparent_45%),radial-gradient(circle_at_80%_85%,rgba(99,102,241,0.12),transparent_40%)]">
            {mapTrips.length === 0 ? (
              <div className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">
                No live coordinates yet.
              </div>
            ) : (
              <>
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(53,61,77,0.25)_1px,transparent_1px),linear-gradient(to_bottom,rgba(53,61,77,0.25)_1px,transparent_1px)] bg-[size:60px_60px]" />
                {mapTrips.map((p) => (
                  <div key={p.id} className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%,-50%)" }}>
                    <div className={[
                      "h-3 w-3 rounded-full border-2 border-background",
                      p.status === "blocked" ? "bg-rose-400" : p.status === "delayed" ? "bg-amber-400" : "bg-sky-400",
                    ].join(" ")} />
                    <div className="mt-1 rounded border border-border bg-background/85 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                      {p.ref}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Completed Today" value={summary.completedToday.toString()} icon={<CheckCircle2 className="h-4 w-4 text-emerald-300" />} />
        <SummaryCard label="Fuel Allocated" value={`${summary.totalFuel.toFixed(0)} L`} icon={<Fuel className="h-4 w-4 text-sky-300" />} />
        <SummaryCard label="Distance Captured" value={`${summary.totalDistance.toFixed(1)} km`} icon={<Route className="h-4 w-4 text-indigo-300" />} />
        <SummaryCard label="Trips in Queue" value={`${trips.length}`} icon={<MapPin className="h-4 w-4 text-amber-300" />} />
      </section>

      <section className="ops-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Recent Trips</h3>
          <Link href="/trips" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            View all <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[860px] w-full text-sm">
            <thead className="bg-muted/60 text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Trip</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Pickup</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-5 text-sm text-muted-foreground">
                    Loading trips...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={6} className="px-4 py-5 text-sm text-rose-300">
                    Failed to load trips.
                  </td>
                </tr>
              ) : recentTrips.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-5 text-sm text-muted-foreground">
                    No trips available.
                  </td>
                </tr>
              ) : (
                recentTrips.map((trip) => (
                  <tr key={trip.id} className="border-t border-border/80 hover:bg-accent/30">
                    <td className="px-4 py-3 font-semibold text-foreground">
                      <Link href={`/trips/${trip.id}`} className="hover:text-primary">
                        {trip.waybill_number ?? trip.reference_code ?? `Trip ${trip.id}`}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {trip.pickup_location ?? "-"} → {trip.destination ?? trip.dropoff_location ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{trip.driver?.name ?? "Unassigned"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{trip.vehicle?.name ?? trip.truck_reg_no ?? "-"}</td>
                    <td className="px-4 py-3"><TripStatusBadge status={trip.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(trip.scheduled_pickup_at ?? trip.trip_date ?? undefined)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  helper,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: ReactNode;
  accent: "active" | "alerts" | "ontime" | "pending";
}) {
  return (
    <article className="ops-card border-l-2 p-4" style={{ borderLeftColor: accent === "active" ? "#38bdf8" : accent === "alerts" ? "#fb7185" : accent === "ontime" ? "#34d399" : "#818cf8" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="ops-section-title">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p>
        </div>
        <div className={[
          "rounded-md border p-2",
          kpiAccent(accent),
        ].join(" ")}>{icon}</div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{helper}</p>
    </article>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <article className="ops-card flex items-center gap-3 p-4">
      <div className="rounded-md border border-border bg-card p-2">{icon}</div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold text-foreground">{value}</p>
      </div>
    </article>
  );
}
