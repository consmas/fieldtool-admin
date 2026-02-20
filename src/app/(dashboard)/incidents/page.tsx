"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createInsuranceClaim,
  fetchIncidentDashboard,
  fetchIncidentReport,
  fetchIncidents,
  updateIncidentStatus,
} from "@/lib/api/compliance_incidents";
import { fetchDrivers, fetchDriversLeaderboard } from "@/lib/api/driver_intelligence";
import { fetchVehicles } from "@/lib/api/vehicles";
import { fetchTrips } from "@/lib/api/trips";

function toNumber(v: unknown) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <article className="ops-card p-4">
      <p className="ops-section-title">{label}</p>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
    </article>
  );
}

const INCIDENT_TYPE_OPTIONS = [
  { value: "tire_issue", label: "Tire Issue" },
  { value: "axle_issue", label: "Axle Issue" },
  { value: "breakdown", label: "Breakdown" },
  { value: "mechanical_failure", label: "Mechanical Failure" },
  { value: "accident", label: "Accident" },
  { value: "delay", label: "Delay" },
];

export default function IncidentsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    status: "",
    type: "",
    severity: "",
    vehicle_id: "",
    driver_id: "",
    trip_id: "",
    date_from: "",
    date_to: "",
  });
  const [claimForm, setClaimForm] = useState({
    incident_id: "",
    claim_number: "",
    claimed_amount: "",
    approved_amount: "",
    status: "submitted",
    notes: "",
  });

  const dashboardQuery = useQuery({
    queryKey: ["incidents", "dashboard"],
    queryFn: () => fetchIncidentDashboard(),
    refetchInterval: 60_000,
  });
  const incidentsQuery = useQuery({
    queryKey: ["incidents", "list", filters],
    queryFn: () => fetchIncidents(filters),
  });
  const reportQuery = useQuery({
    queryKey: ["incidents", "report", filters.date_from, filters.date_to],
    queryFn: () => fetchIncidentReport({ date_from: filters.date_from || undefined, date_to: filters.date_to || undefined }),
  });

  const vehiclesQuery = useQuery({ queryKey: ["vehicles", "incidents"], queryFn: fetchVehicles });
  const driversQuery = useQuery({ queryKey: ["drivers", "incidents"], queryFn: fetchDrivers });
  const tripsQuery = useQuery({ queryKey: ["trips", "incidents"], queryFn: fetchTrips });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string | number; status: string }) =>
      updateIncidentStatus(id, { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["incidents", "list"] });
      await queryClient.invalidateQueries({ queryKey: ["incidents", "dashboard"] });
    },
  });

  const claimMutation = useMutation({
    mutationFn: () =>
      createInsuranceClaim(claimForm.incident_id, {
        claim_number: claimForm.claim_number || undefined,
        claimed_amount: toNumber(claimForm.claimed_amount),
        approved_amount: toNumber(claimForm.approved_amount),
        status: claimForm.status,
        notes: claimForm.notes || undefined,
      }),
    onSuccess: async () => {
      setClaimForm({
        incident_id: "",
        claim_number: "",
        claimed_amount: "",
        approved_amount: "",
        status: "submitted",
        notes: "",
      });
      await queryClient.invalidateQueries({ queryKey: ["incidents", "list"] });
      await queryClient.invalidateQueries({ queryKey: ["incidents", "report"] });
    },
  });

  const dashboard = useMemo(() => (dashboardQuery.data ?? {}) as Record<string, unknown>, [dashboardQuery.data]);
  const incidents = useMemo(() => incidentsQuery.data ?? [], [incidentsQuery.data]);
  const report = useMemo(() => (reportQuery.data ?? {}) as Record<string, unknown>, [reportQuery.data]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ops-section-title">Incidents</p>
          <h2 className="text-lg font-semibold md:text-xl">Incident Management</h2>
          <p className="text-sm text-muted-foreground">Queue, investigation, claims and SLA visibility.</p>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Open Incidents" value={String(toNumber(dashboard.open_incidents ?? dashboard.open))} />
        <Kpi label="Pending Investigations" value={String(toNumber(dashboard.pending_investigations ?? dashboard.pending))} />
        <Kpi label="Unresolved Claims" value={String(toNumber(dashboard.unresolved_claims ?? dashboard.claims_unresolved))} />
        <Kpi label="Avg Resolution Days" value={toNumber(report.avg_resolution_days ?? dashboard.avg_resolution_days).toFixed(1)} />
      </section>

      <section className="ops-card p-4">
        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
          <select value={filters.type} onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option value="">All types</option>
            {INCIDENT_TYPE_OPTIONS.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <select value={filters.severity} onChange={(e) => setFilters((p) => ({ ...p, severity: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option value="">All severity</option>
            <option value="critical">critical</option>
            <option value="high">high</option>
            <option value="medium">medium</option>
            <option value="low">low</option>
          </select>
          <select value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option value="">All status</option>
            <option value="reported">reported</option>
            <option value="acknowledged">acknowledged</option>
            <option value="investigating">investigating</option>
            <option value="resolved">resolved</option>
            <option value="closed">closed</option>
          </select>
          <select value={filters.vehicle_id} onChange={(e) => setFilters((p) => ({ ...p, vehicle_id: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option value="">All vehicles</option>
            {(vehiclesQuery.data ?? []).map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>)}
          </select>
          <select value={filters.driver_id} onChange={(e) => setFilters((p) => ({ ...p, driver_id: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option value="">All drivers</option>
            {(driversQuery.data ?? []).map((driver, idx) => {
              const row = driver as Record<string, unknown>;
              const rawId = row.id ?? row.driver_id ?? row.user_id;
              if (rawId == null) return null;
              const id = String(rawId);
              return <option key={`${id}-${idx}`} value={id}>{String(row.name ?? row.email ?? `Driver ${id}`)}</option>;
            })}
          </select>
          <select value={filters.trip_id} onChange={(e) => setFilters((p) => ({ ...p, trip_id: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option value="">All trips</option>
            {(tripsQuery.data ?? []).map((trip) => <option key={trip.id} value={trip.id}>{trip.waybill_number ?? trip.reference_code ?? `Trip ${trip.id}`}</option>)}
          </select>
          <input type="date" value={filters.date_from} onChange={(e) => setFilters((p) => ({ ...p, date_from: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <input type="date" value={filters.date_to} onChange={(e) => setFilters((p) => ({ ...p, date_to: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
        </div>
      </section>

      <section className="ops-card p-4">
        <h3 className="mb-2 text-sm font-semibold">Incident Queue</h3>
        {incidentsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading incidents...</p> : null}
        {incidentsQuery.isError ? <p className="text-sm text-rose-300">Unable to load incidents.</p> : null}
        {!incidentsQuery.isLoading && !incidentsQuery.isError && incidents.length === 0 ? <p className="text-sm text-muted-foreground">No incidents found.</p> : null}
        {incidents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1300px] text-sm">
              <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="py-2">Incident #</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Severity</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Vehicle</th>
                  <th className="py-2">Driver</th>
                  <th className="py-2">Date</th>
                  <th className="py-2">Claim Status</th>
                  <th className="py-2">Investigator</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident, idx) => {
                  const row = incident as Record<string, unknown>;
                  const id = (row.id ?? row.incident_id ?? idx) as string | number;
                  return (
                    <tr key={String(id)} className="border-t border-border">
                      <td className="py-2 text-foreground">{String(row.incident_number ?? `INC-${id}`)}</td>
                      <td className="py-2 text-muted-foreground">{String(row.type ?? "-")}</td>
                      <td className="py-2 text-muted-foreground">{String(row.severity ?? "-")}</td>
                      <td className="py-2 text-muted-foreground">{String(row.status ?? "-")}</td>
                      <td className="py-2 text-muted-foreground">{String(row.vehicle_name ?? row.vehicle_id ?? "-")}</td>
                      <td className="py-2 text-muted-foreground">{String(row.driver_name ?? row.driver_id ?? "-")}</td>
                      <td className="py-2 text-muted-foreground">{String(row.reported_at ?? row.created_at ?? "-")}</td>
                      <td className="py-2 text-muted-foreground">{String(row.claim_status ?? row.insurance_claim_status ?? "-")}</td>
                      <td className="py-2 text-muted-foreground">{String(row.investigator_name ?? row.investigator_id ?? "-")}</td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/incidents/${id}`} className="rounded border border-border px-2 py-1 text-xs">
                            Open
                          </Link>
                          <button type="button" className="rounded border border-border px-2 py-1 text-xs" onClick={() => statusMutation.mutate({ id, status: "investigating" })}>
                            Start
                          </button>
                          <button type="button" className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300" onClick={() => statusMutation.mutate({ id, status: "resolved" })}>
                            Resolve
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="ops-card p-4">
        <h3 className="mb-2 text-sm font-semibold">Create / Update Claim</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <select value={claimForm.incident_id} onChange={(e) => setClaimForm((p) => ({ ...p, incident_id: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option value="">Select incident</option>
            {incidents.map((incident, idx) => {
              const row = incident as Record<string, unknown>;
              const id = row.id ?? row.incident_id ?? idx;
              return <option key={String(id)} value={String(id)}>{String(row.incident_number ?? `INC-${id}`)}</option>;
            })}
          </select>
          <input value={claimForm.claim_number} onChange={(e) => setClaimForm((p) => ({ ...p, claim_number: e.target.value }))} placeholder="Claim number" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <select value={claimForm.status} onChange={(e) => setClaimForm((p) => ({ ...p, status: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option value="submitted">submitted</option>
            <option value="reviewing">reviewing</option>
            <option value="approved">approved</option>
            <option value="settled">settled</option>
            <option value="denied">denied</option>
          </select>
          <input value={claimForm.claimed_amount} onChange={(e) => setClaimForm((p) => ({ ...p, claimed_amount: e.target.value }))} placeholder="Claimed amount" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <input value={claimForm.approved_amount} onChange={(e) => setClaimForm((p) => ({ ...p, approved_amount: e.target.value }))} placeholder="Approved amount" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <input value={claimForm.notes} onChange={(e) => setClaimForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
        </div>
        <button type="button" className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" onClick={() => claimMutation.mutate()} disabled={claimMutation.isPending || !claimForm.incident_id}>
          {claimMutation.isPending ? "Saving..." : "Save Claim"}
        </button>
      </section>
    </div>
  );
}
