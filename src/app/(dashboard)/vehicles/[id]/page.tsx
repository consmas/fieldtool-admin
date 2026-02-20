"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchVehicle } from "@/lib/api/vehicles";
import { fetchTrips } from "@/lib/api/trips";
import { fetchExpenses } from "@/lib/api/expenses";
import {
  createWorkOrder,
  createMaintenanceScheduleTemplate,
  deleteMaintenanceScheduleTemplate,
  fetchMaintenanceSchedules,
  fetchMaintenanceScheduleTemplates,
  fetchVehicleDocuments,
  fetchVehicleMaintenanceHistory,
  fetchWorkOrders,
  updateMaintenanceScheduleTemplate,
} from "@/lib/api/maintenance";
import { formatDate } from "@/lib/utils/format";

function asNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function asList(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
  if (value && typeof value === "object") {
    const payload = value as Record<string, unknown>;
    if (Array.isArray(payload.data)) return payload.data as Array<Record<string, unknown>>;
    if (Array.isArray(payload.items)) return payload.items as Array<Record<string, unknown>>;
    if (Array.isArray(payload.results)) return payload.results as Array<Record<string, unknown>>;
    if (Array.isArray(payload.templates)) return payload.templates as Array<Record<string, unknown>>;
    if (Array.isArray(payload.schedules)) return payload.schedules as Array<Record<string, unknown>>;
    if (Array.isArray(payload.maintenance_schedules)) return payload.maintenance_schedules as Array<Record<string, unknown>>;
  }
  return [];
}

function urgencyClass(priority?: string, overdue?: boolean) {
  const p = String(priority ?? "").toLowerCase();
  if (overdue || p === "critical") return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  if (p === "high") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
}

function getTemplateId(row: Record<string, unknown>) {
  return (
    row.id ??
    row.template_id ??
    row.schedule_id ??
    row.maintenance_schedule_template_id ??
    row.templateId ??
    row.scheduleTemplateId ??
    null
  );
}

function getTemplateName(row: Record<string, unknown>) {
  return String(
    row.name ??
      row.template_name ??
      row.schedule_name ??
      row.title ??
      ""
  ).trim();
}

function getTemplateIntervalDays(row: Record<string, unknown>) {
  return asNumber(
    row.interval_days ??
      row.frequency_days ??
      row.every_n_days ??
      row.cadence_days
  );
}

function getTemplateNextDueKm(row: Record<string, unknown>) {
  const value =
    row.next_due_km ??
    row.due_km ??
    row.nextDueKm;
  return value === undefined || value === null || value === "" ? null : asNumber(value);
}

function getTemplateNextDueAt(row: Record<string, unknown>) {
  return String(
    row.next_due_at ??
      row.next_due_date ??
      row.due_at ??
      row.nextDueAt ??
      ""
  ).trim();
}

function insuranceStatus(expiry?: string | null) {
  if (!expiry) return { label: "Missing", className: "border-rose-500/30 bg-rose-500/10 text-rose-300" };
  const ts = new Date(expiry).getTime();
  if (!Number.isFinite(ts)) return { label: "Unknown", className: "border-border bg-card text-muted-foreground" };
  const days = Math.ceil((ts - Date.now()) / (24 * 60 * 60 * 1000));
  if (days < 0) return { label: "Expired", className: "border-rose-500/30 bg-rose-500/10 text-rose-300" };
  if (days <= 30) return { label: "Expiring Soon", className: "border-amber-500/30 bg-amber-500/10 text-amber-300" };
  return { label: "Active", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" };
}

type ScheduleRow = Record<string, unknown> & {
  __template_id: unknown | null;
  __template_name: string;
  __interval_days: number;
  __next_due_km: number | null;
  __next_due_at: string;
};

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "red" | "amber" | "green" }) {
  return (
    <article
      className={[
        "ops-card border-l-2 p-4",
        tone === "red" ? "border-l-rose-400" : tone === "amber" ? "border-l-amber-400" : "border-l-emerald-400",
      ].join(" ")}
    >
      <p className="ops-section-title">{label}</p>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
    </article>
  );
}

export default function VehicleDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const vehicleId = Number(params?.id ?? 0);
  const [nowTs] = useState(() => Date.now());

  const [templateForm, setTemplateForm] = useState({
    name: "",
    interval_days: "30",
    next_due_km: "",
    next_due_at: "",
  });
  const [editingTemplateId, setEditingTemplateId] = useState<string | number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const vehicleQuery = useQuery({
    queryKey: ["vehicles", "detail", vehicleId],
    queryFn: () => fetchVehicle(vehicleId),
    enabled: Number.isFinite(vehicleId) && vehicleId > 0,
  });

  const tripsQuery = useQuery({
    queryKey: ["trips", "vehicle", vehicleId],
    queryFn: fetchTrips,
    enabled: Number.isFinite(vehicleId) && vehicleId > 0,
  });

  const expensesQuery = useQuery({
    queryKey: ["expenses", "vehicle", vehicleId],
    queryFn: () => fetchExpenses({ vehicle_id: vehicleId, per_page: 100 }),
    enabled: Number.isFinite(vehicleId) && vehicleId > 0,
  });

  const workOrdersQuery = useQuery({
    queryKey: ["maintenance", "work_orders", "vehicle", vehicleId],
    queryFn: () => fetchWorkOrders({ vehicle_id: vehicleId, per_page: 100, sort_by: "scheduled_date", sort_order: "desc" }),
    enabled: Number.isFinite(vehicleId) && vehicleId > 0,
  });

  const documentsQuery = useQuery({
    queryKey: ["maintenance", "vehicle_documents", vehicleId],
    queryFn: () => fetchVehicleDocuments(vehicleId),
    enabled: Number.isFinite(vehicleId) && vehicleId > 0,
  });

  const schedulesQuery = useQuery({
    queryKey: ["maintenance", "schedule_templates", vehicleId],
    queryFn: async () => {
      try {
        return await fetchMaintenanceSchedules({ vehicle_id: vehicleId });
      } catch {
        return fetchMaintenanceScheduleTemplates({ vehicle_id: vehicleId });
      }
    },
    enabled: Number.isFinite(vehicleId) && vehicleId > 0,
  });

  const historyQuery = useQuery({
    queryKey: ["maintenance", "vehicle_history", vehicleId],
    queryFn: () => fetchVehicleMaintenanceHistory(vehicleId),
    enabled: Number.isFinite(vehicleId) && vehicleId > 0,
  });

  const createTemplateMutation = useMutation({
    mutationFn: createMaintenanceScheduleTemplate,
    onSuccess: async () => {
      setMessage("Maintenance schedule template created.");
      setTemplateForm({ name: "", interval_days: "30", next_due_km: "", next_due_at: "" });
      setEditingTemplateId(null);
      await queryClient.invalidateQueries({ queryKey: ["maintenance", "schedule_templates", vehicleId] });
      await queryClient.invalidateQueries({ queryKey: ["maintenance", "due"] });
    },
    onError: () => setMessage("Unable to create schedule template."),
  });
  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: Record<string, unknown> }) =>
      updateMaintenanceScheduleTemplate(id, payload),
    onSuccess: async () => {
      setMessage("Maintenance schedule template updated.");
      setTemplateForm({ name: "", interval_days: "30", next_due_km: "", next_due_at: "" });
      setEditingTemplateId(null);
      await queryClient.invalidateQueries({ queryKey: ["maintenance", "schedule_templates", vehicleId] });
      await queryClient.invalidateQueries({ queryKey: ["maintenance", "due"] });
    },
    onError: () => setMessage("Unable to update schedule template."),
  });
  const deleteTemplateMutation = useMutation({
    mutationFn: deleteMaintenanceScheduleTemplate,
    onSuccess: async () => {
      setMessage("Maintenance schedule template deleted.");
      if (editingTemplateId) setEditingTemplateId(null);
      await queryClient.invalidateQueries({ queryKey: ["maintenance", "schedule_templates", vehicleId] });
      await queryClient.invalidateQueries({ queryKey: ["maintenance", "due"] });
    },
    onError: () => setMessage("Unable to delete schedule template."),
  });
  const createWorkOrderFromTemplateMutation = useMutation({
    mutationFn: createWorkOrder,
    onSuccess: async () => {
      setMessage("Work order created from template.");
      await queryClient.invalidateQueries({ queryKey: ["maintenance", "work_orders", "vehicle", vehicleId] });
      await queryClient.invalidateQueries({ queryKey: ["maintenance", "work_orders"] });
    },
    onError: () => setMessage("Unable to create work order from template."),
  });

  const vehicle = vehicleQuery.data;
  const allTrips = useMemo(() => tripsQuery.data ?? [], [tripsQuery.data]);
  const trips = useMemo(
    () =>
      allTrips
        .filter(
          (trip) =>
            trip.vehicle_id === vehicleId ||
            trip.vehicle?.id === vehicleId ||
            trip.truck_id === vehicleId ||
            trip.truck?.id === vehicleId
        )
        .sort((a, b) => new Date(b.trip_date ?? b.scheduled_pickup_at ?? 0).getTime() - new Date(a.trip_date ?? a.scheduled_pickup_at ?? 0).getTime()),
    [allTrips, vehicleId]
  );

  const expenses = useMemo(() => expensesQuery.data?.items ?? [], [expensesQuery.data?.items]);
  const workOrders = useMemo(() => asList(workOrdersQuery.data), [workOrdersQuery.data]);
  const documents = useMemo(() => asList(documentsQuery.data), [documentsQuery.data]);
  const schedules = useMemo<ScheduleRow[]>(() => {
    const rows = asList(schedulesQuery.data);
    return rows
      .map(
        (row): ScheduleRow => ({
        ...row,
        __template_id: getTemplateId(row),
        __template_name: getTemplateName(row),
        __interval_days: getTemplateIntervalDays(row),
        __next_due_km: getTemplateNextDueKm(row),
        __next_due_at: getTemplateNextDueAt(row),
        })
      )
      .filter((row) => {
        return Boolean(
          row.__template_id ||
            row.__template_name ||
            row.__interval_days ||
            row.__next_due_km !== null ||
            row.__next_due_at
        );
      });
  }, [schedulesQuery.data]);
  const maintenanceHistory = useMemo(() => asList(historyQuery.data), [historyQuery.data]);

  const getTemplateHealth = (row: Record<string, unknown>) => {
    const dueAtRaw = getTemplateNextDueAt(row);
    if (!dueAtRaw) return { label: "Healthy", className: urgencyClass("low", false) };
    const dueTs = new Date(dueAtRaw).getTime();
    if (!Number.isFinite(dueTs)) return { label: "Healthy", className: urgencyClass("low", false) };
    if (dueTs < nowTs) return { label: "Overdue", className: urgencyClass("critical", true) };
    const daysToDue = Math.ceil((dueTs - nowTs) / (24 * 60 * 60 * 1000));
    if (daysToDue <= 14) return { label: "Due Soon", className: urgencyClass("high", false) };
    return { label: "Healthy", className: urgencyClass("low", false) };
  };

  const kpis = useMemo(() => {
    const completedTrips = trips.filter((trip) => {
      const status = String(trip.status ?? "").toLowerCase();
      return ["completed", "arrived", "offloaded"].includes(status);
    }).length;

    const openWorkOrders = workOrders.filter((row) => {
      const status = String(row.status ?? "").toLowerCase();
      return ["open", "in_progress"].includes(status);
    }).length;

    const overdueDocs = documents.filter((row) => {
      const expiry = String(row.expiry_date ?? row.expiry ?? "");
      if (!expiry) return false;
      const ts = new Date(expiry).getTime();
      return Number.isFinite(ts) && ts < nowTs;
    }).length;

    const totalExpenses = expenses.reduce((sum, row) => sum + asNumber(row.amount), 0);

    return {
      tripCount: trips.length,
      completedTrips,
      openWorkOrders,
      overdueDocs,
      totalExpenses,
      scheduleTemplates: schedules.length,
    };
  }, [documents, expenses, nowTs, schedules.length, trips, workOrders]);

  if (vehicleQuery.isLoading) {
    return <div className="ops-card p-6 text-sm text-muted-foreground">Loading vehicle dashboard...</div>;
  }

  if (vehicleQuery.isError || !vehicle) {
    return <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-300">Unable to load vehicle dashboard.</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ops-section-title">Vehicles</p>
          <h2 className="text-lg font-semibold md:text-xl">{vehicle.name}</h2>
          <p className="text-sm text-muted-foreground">
            Plate: {vehicle.license_plate ?? "-"} · Kind: {vehicle.kind} · Active: {vehicle.active ? "Yes" : "No"}
          </p>
          <div className="mt-2">
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${insuranceStatus(vehicle.insurance_expires_at).className}`}>
              Insurance: {insuranceStatus(vehicle.insurance_expires_at).label}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/maintenance?tab=work_orders&vehicle_id=${vehicleId}`} className="rounded-lg border border-border px-3 py-2 text-sm">
            Open Maintenance
          </Link>
          <Link href={`/vehicles/${vehicleId}/edit`} className="rounded-lg border border-border px-3 py-2 text-sm">
            Edit Vehicle
          </Link>
          <Link href="/vehicles" className="rounded-lg border border-border px-3 py-2 text-sm">
            Back to Vehicles
          </Link>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Kpi label="Trips" value={String(kpis.tripCount)} tone="green" />
        <Kpi label="Completed Trips" value={String(kpis.completedTrips)} tone="green" />
        <Kpi label="Open Work Orders" value={String(kpis.openWorkOrders)} tone={kpis.openWorkOrders > 0 ? "amber" : "green"} />
        <Kpi label="Overdue Documents" value={String(kpis.overdueDocs)} tone={kpis.overdueDocs > 0 ? "red" : "green"} />
        <Kpi label="Total Expenses" value={kpis.totalExpenses.toFixed(2)} tone="amber" />
        <Kpi label="Schedule Templates" value={String(kpis.scheduleTemplates)} tone="green" />
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="ops-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Maintenance Schedules</h3>
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setMessage(null);
              const payload = {
                vehicle_id: vehicleId,
                name: templateForm.name,
                interval_days: asNumber(templateForm.interval_days),
                next_due_km: templateForm.next_due_km ? asNumber(templateForm.next_due_km) : undefined,
                next_due_at: templateForm.next_due_at || undefined,
              };
              if (editingTemplateId) {
                updateTemplateMutation.mutate({ id: editingTemplateId, payload });
              } else {
                createTemplateMutation.mutate(payload);
              }
            }}
          >
            <input
              value={templateForm.name}
              onChange={(e) => setTemplateForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Template name"
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={templateForm.interval_days}
              onChange={(e) => setTemplateForm((p) => ({ ...p, interval_days: e.target.value }))}
              placeholder="Interval days"
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={templateForm.next_due_km}
              onChange={(e) => setTemplateForm((p) => ({ ...p, next_due_km: e.target.value }))}
              placeholder="Next due km"
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
            <input
              type="datetime-local"
              value={templateForm.next_due_at}
              onChange={(e) => setTemplateForm((p) => ({ ...p, next_due_at: e.target.value }))}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground md:col-span-2"
              disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
            >
              {createTemplateMutation.isPending || updateTemplateMutation.isPending
                ? editingTemplateId
                  ? "Updating..."
                  : "Creating..."
                : editingTemplateId
                ? "Update Schedule Template"
                : "Create Schedule Template"}
            </button>
          </form>
          {editingTemplateId ? (
            <button
              type="button"
              className="mt-2 rounded border border-border px-3 py-1 text-xs text-muted-foreground"
              onClick={() => {
                setEditingTemplateId(null);
                setTemplateForm({ name: "", interval_days: "30", next_due_km: "", next_due_at: "" });
              }}
            >
              Cancel edit
            </button>
          ) : null}
          {message ? <p className="mt-3 text-xs text-muted-foreground">{message}</p> : null}

          <div className="mt-4 space-y-2">
            {schedulesQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading templates...</p> : null}
            {!schedulesQuery.isLoading && schedules.length === 0 ? <p className="text-sm text-muted-foreground">No templates yet.</p> : null}
            {schedules.map((row, idx) => (
              <article key={idx} className="rounded border border-border p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-foreground">{getTemplateName(row) || "Schedule"}</p>
                  <span
                    className={[
                      "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                      getTemplateHealth(row).className,
                    ].join(" ")}
                  >
                    {getTemplateHealth(row).label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Every {getTemplateIntervalDays(row)} days · Next km {String(getTemplateNextDueKm(row) ?? "-")} · Next date {getTemplateNextDueAt(row) || "-"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded border border-border px-2 py-1 text-xs"
                    disabled={!getTemplateId(row)}
                    onClick={() => {
                      const templateId = getTemplateId(row);
                      if (!templateId) {
                        setMessage("Unable to edit template: missing template id from backend.");
                        return;
                      }
                      setEditingTemplateId(templateId as string | number);
                      setTemplateForm({
                        name: getTemplateName(row),
                        interval_days: String(getTemplateIntervalDays(row) || 30),
                        next_due_km: getTemplateNextDueKm(row) !== null ? String(getTemplateNextDueKm(row)) : "",
                        next_due_at: getTemplateNextDueAt(row) ? String(getTemplateNextDueAt(row)).slice(0, 16) : "",
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs text-rose-300"
                    disabled={!getTemplateId(row)}
                    onClick={() => {
                      const id = getTemplateId(row);
                      if (!id) return;
                      if (window.confirm("Delete this schedule template?")) {
                        deleteTemplateMutation.mutate(id as string | number);
                      }
                    }}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className="rounded border border-border px-2 py-1 text-xs"
                    onClick={() =>
                      createWorkOrderFromTemplateMutation.mutate({
                        vehicle_id: vehicleId,
                        type: String(row.type ?? "preventive"),
                        priority: String(row.priority ?? "medium"),
                        status: "open",
                        scheduled_date: getTemplateNextDueAt(row),
                        description: String(
                          row.description ??
                            `Generated from schedule template: ${getTemplateName(row) || "Schedule"}`
                        ),
                        template_id: getTemplateId(row),
                      })
                    }
                    disabled={createWorkOrderFromTemplateMutation.isPending}
                  >
                    {createWorkOrderFromTemplateMutation.isPending ? "Creating..." : "Create Work Order"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="ops-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Work Orders</h3>
          {workOrdersQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading work orders...</p> : null}
          {!workOrdersQuery.isLoading && workOrders.length === 0 ? <p className="text-sm text-muted-foreground">No work orders.</p> : null}
          <div className="space-y-2">
            {workOrders.slice(0, 8).map((row, idx) => {
              const priority = String(row.priority ?? "medium");
              const overdue = String(row.status ?? "") === "overdue";
              return (
                <article key={idx} className="rounded border border-border p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-foreground">{String(row.wo_number ?? row.number ?? `WO-${idx + 1}`)}</p>
                    <span className={["rounded-full border px-2 py-0.5 text-[11px] font-semibold", urgencyClass(priority, overdue)].join(" ")}>
                      {String(row.priority ?? "-")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {String(row.type ?? "-")} · {String(row.status ?? "-")} · Scheduled {String(row.scheduled_date ?? "-")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Cost: {asNumber(row.actual_cost).toFixed(2)}</p>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section id="insurance" className="ops-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Insurance</h3>
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">Policy: <span className="text-foreground">{vehicle.insurance_policy_number ?? "-"}</span></p>
            <p className="text-muted-foreground">Provider: <span className="text-foreground">{vehicle.insurance_provider ?? "-"}</span></p>
            <p className="text-muted-foreground">Issued: <span className="text-foreground">{vehicle.insurance_issued_at ?? "-"}</span></p>
            <p className="text-muted-foreground">Expires: <span className="text-foreground">{vehicle.insurance_expires_at ?? "-"}</span></p>
            <p className="text-muted-foreground">Coverage: <span className="text-foreground">{vehicle.insurance_coverage_amount ?? "-"}</span></p>
            <p className="text-muted-foreground">Notes: <span className="text-foreground">{vehicle.insurance_notes ?? "-"}</span></p>
            {vehicle.insurance?.document_url || vehicle.insurance_document_url ? (
              <a
                href={String(vehicle.insurance?.document_url ?? vehicle.insurance_document_url)}
                target="_blank"
                rel="noreferrer"
                className="inline-block rounded border border-border px-2 py-1 text-xs"
              >
                Open Insurance File
              </a>
            ) : (
              <p className="text-xs text-muted-foreground">No insurance file attached.</p>
            )}
          </div>
        </section>

        <section className="ops-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Vehicle Documents</h3>
          {documentsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading documents...</p> : null}
          {!documentsQuery.isLoading && documents.length === 0 ? <p className="text-sm text-muted-foreground">No documents found.</p> : null}
          <div className="space-y-2">
            {documents.map((row, idx) => {
              const expiry = String(row.expiry_date ?? row.expiry ?? "-");
              const overdue = expiry !== "-" && new Date(expiry).getTime() < nowTs;
              return (
                <article key={idx} className="rounded border border-border p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-foreground">{String(row.title ?? row.name ?? "Document")}</p>
                    <span className={["rounded-full border px-2 py-0.5 text-[11px] font-semibold", urgencyClass(overdue ? "critical" : "low", overdue)].join(" ")}>
                      {overdue ? "Overdue" : "Valid"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{String(row.type ?? "-")} · Expiry: {expiry}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="ops-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Recent Trips & Expenses</h3>
          <div className="space-y-2">
            {trips.slice(0, 5).map((trip) => (
              <article key={trip.id} className="rounded border border-border p-3 text-sm">
                <p className="font-semibold text-foreground">{trip.waybill_number ?? trip.reference_code ?? `Trip ${trip.id}`}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {trip.pickup_location ?? "-"} → {trip.destination ?? trip.dropoff_location ?? "-"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(trip.trip_date ?? trip.scheduled_pickup_at ?? undefined)}</p>
              </article>
            ))}
            {expenses.slice(0, 5).map((expense) => (
              <article key={expense.id} className="rounded border border-border p-3 text-sm">
                <p className="font-semibold text-foreground">{String(expense.category ?? "Expense")}</p>
                <p className="mt-1 text-xs text-muted-foreground">Amount: {asNumber(expense.amount).toFixed(2)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{String(expense.status ?? "-")}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="ops-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Maintenance History</h3>
        {historyQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading history...</p> : null}
        {!historyQuery.isLoading && maintenanceHistory.length === 0 ? <p className="text-sm text-muted-foreground">No history available.</p> : null}
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {maintenanceHistory.map((row, idx) => (
            <article key={idx} className="rounded border border-border p-3 text-sm">
              <p className="font-semibold text-foreground">{String(row.wo_number ?? row.work_order ?? row.title ?? "Work Order")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{String(row.date ?? row.completed_at ?? row.scheduled_date ?? "-")}</p>
              <p className="mt-1 text-xs text-muted-foreground">Cost: {asNumber(row.actual_cost ?? row.cost).toFixed(2)}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
