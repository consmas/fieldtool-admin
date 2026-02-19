"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addWorkOrderComment,
  addWorkOrderPart,
  createMaintenanceScheduleTemplate,
  createVehicleDocument,
  createVendor,
  createWorkOrder,
  deleteVendor,
  fetchDueMaintenance,
  fetchExpiringDocuments,
  fetchMaintenanceReport,
  fetchVendors,
  fetchVehicleDocuments,
  fetchVehicleMaintenanceHistory,
  fetchWorkOrder,
  fetchWorkOrders,
  updateVehicleDocument,
  updateVendor,
  updateWorkOrder,
  updateWorkOrderStatus,
} from "@/lib/api/maintenance";
import { fetchUsers } from "@/lib/api/users";
import { fetchVehicles } from "@/lib/api/vehicles";

const tabs = [
  { key: "due", label: "Due Maintenance" },
  { key: "work_orders", label: "Work Orders" },
  { key: "vendors", label: "Vendors" },
  { key: "documents", label: "Vehicle Documents" },
  { key: "reports", label: "Maintenance Reports" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

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
  }
  return [];
}

function pickPath(source: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = source;
  for (const part of parts) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function pickFirst(source: Record<string, unknown>, paths: string[]): unknown {
  for (const path of paths) {
    const value = pickPath(source, path);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function toText(value: unknown, fallback = "-") {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    const row = value as Record<string, unknown>;
    const nested =
      row.name ??
      row.label ??
      row.title ??
      row.license_plate ??
      row.reg_no ??
      row.truck_reg_no ??
      row.id;
    if (nested !== undefined && nested !== null && nested !== "") return String(nested);
  }
  return fallback;
}

function urgencyClass(priority?: string, overdue?: boolean) {
  const p = String(priority ?? "").toLowerCase();
  if (overdue || p === "critical") return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  if (p === "high") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
}

function Loading() {
  return <div className="ops-card p-6 text-sm text-muted-foreground">Loading...</div>;
}

function Error() {
  return <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-300">Unable to load data.</div>;
}

function Empty({ label }: { label: string }) {
  return <div className="ops-card p-6 text-sm text-muted-foreground">No {label} found.</div>;
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "red" | "amber" | "green" }) {
  return (
    <article
      className={[
        "ops-card border-l-2 p-4",
        tone === "red" ? "border-l-rose-400" : tone === "amber" ? "border-l-amber-400" : "border-l-emerald-400",
      ].join(" ")}
    >
      <p className="ops-section-title">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </article>
  );
}

export default function MaintenancePage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [nowTs] = useState(() => Date.now());
  const initialTabParam = searchParams.get("tab");
  const initialVehicleIdParam = searchParams.get("vehicle_id") ?? "";
  const initialTab: TabKey =
    initialTabParam && tabs.some((t) => t.key === initialTabParam)
      ? (initialTabParam as TabKey)
      : "due";
  const [tab, setTab] = useState<TabKey>(initialTab);

  const [dueFilters, setDueFilters] = useState({ priority: "", vehicle_id: "", overdue_only: false });

  const [woFilters, setWoFilters] = useState({
    q: "",
    status: "",
    priority: "",
    vehicle_id: initialTab === "work_orders" ? initialVehicleIdParam : "",
    sort_by: "scheduled_date",
    sort_order: "desc" as "asc" | "desc",
    page: 1,
    per_page: 20,
  });
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<number | null>(null);
  const [woForm, setWoForm] = useState({
    vehicle_id: initialTab === "work_orders" ? initialVehicleIdParam : "",
    type: "corrective",
    status: "open",
    priority: "medium",
    assigned_to: "",
    scheduled_date: "",
    description: "",
    actual_cost: "",
  });
  const [woFormMessage, setWoFormMessage] = useState("");

  const [vendorForm, setVendorForm] = useState({ id: "", name: "", contact_person: "", phone: "", email: "" });
  const [documentsState, setDocumentsState] = useState({ vehicle_id: initialTab === "documents" ? initialVehicleIdParam : "", title: "", type: "", expiry_date: "", file_url: "", id: "" });
  const [reportVehicleId, setReportVehicleId] = useState(initialTab === "reports" ? initialVehicleIdParam : "");

  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles", "maintenance"], queryFn: fetchVehicles });
  const { data: users = [] } = useQuery({ queryKey: ["users", "maintenance"], queryFn: fetchUsers });

  const dueQuery = useQuery({
    queryKey: ["maintenance", "due", dueFilters],
    queryFn: () =>
      fetchDueMaintenance({
        priority: dueFilters.priority || undefined,
        vehicle_id: dueFilters.vehicle_id ? Number(dueFilters.vehicle_id) : undefined,
        overdue_only: dueFilters.overdue_only || undefined,
      }),
    enabled: tab === "due",
  });

  const workOrdersQuery = useQuery({
    queryKey: ["maintenance", "work_orders", woFilters],
    queryFn: () =>
      fetchWorkOrders({
        page: woFilters.page,
        per_page: woFilters.per_page,
        q: woFilters.q || undefined,
        status: woFilters.status || undefined,
        priority: woFilters.priority || undefined,
        vehicle_id: woFilters.vehicle_id ? Number(woFilters.vehicle_id) : undefined,
        sort_by: woFilters.sort_by,
        sort_order: woFilters.sort_order,
      }),
    enabled: tab === "work_orders",
  });

  const selectedWorkOrderQuery = useQuery({
    queryKey: ["maintenance", "work_order", selectedWorkOrderId],
    queryFn: () => fetchWorkOrder(Number(selectedWorkOrderId)),
    enabled: tab === "work_orders" && !!selectedWorkOrderId,
  });

  const vendorsQuery = useQuery({
    queryKey: ["maintenance", "vendors"],
    queryFn: () => fetchVendors(),
    enabled: tab === "vendors",
  });

  const vehicleDocsQuery = useQuery({
    queryKey: ["maintenance", "vehicle_documents", documentsState.vehicle_id],
    queryFn: () => fetchVehicleDocuments(Number(documentsState.vehicle_id)),
    enabled: tab === "documents" && !!documentsState.vehicle_id,
  });

  const expiringDocsQuery = useQuery({
    queryKey: ["maintenance", "documents_expiring"],
    queryFn: () => fetchExpiringDocuments(),
    enabled: tab === "documents",
  });

  const maintenanceReportQuery = useQuery({
    queryKey: ["maintenance", "reports"],
    queryFn: () => fetchMaintenanceReport(),
    enabled: tab === "reports",
  });

  const vehicleHistoryQuery = useQuery({
    queryKey: ["maintenance", "vehicle_history", reportVehicleId],
    queryFn: () => fetchVehicleMaintenanceHistory(Number(reportVehicleId)),
    enabled: tab === "reports" && !!reportVehicleId,
  });

  const invalidateWorkOrders = async () => {
    await queryClient.invalidateQueries({ queryKey: ["maintenance", "work_orders"] });
    if (selectedWorkOrderId) await queryClient.invalidateQueries({ queryKey: ["maintenance", "work_order", selectedWorkOrderId] });
  };

  const createWorkOrderMutation = useMutation({
    mutationFn: createWorkOrder,
    onSuccess: invalidateWorkOrders,
  });
  const updateWorkOrderMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) => updateWorkOrder(id, payload),
    onSuccess: invalidateWorkOrders,
  });
  const transitionMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateWorkOrderStatus(id, { status }),
    onSuccess: invalidateWorkOrders,
  });
  const commentMutation = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) => addWorkOrderComment(id, { comment }),
    onSuccess: invalidateWorkOrders,
  });
  const partMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) => addWorkOrderPart(id, payload),
    onSuccess: invalidateWorkOrders,
  });
  const scheduleTemplateMutation = useMutation({
    mutationFn: createMaintenanceScheduleTemplate,
  });

  const vendorCreateMutation = useMutation({
    mutationFn: createVendor,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["maintenance", "vendors"] }),
  });
  const vendorUpdateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) => updateVendor(id, payload),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["maintenance", "vendors"] }),
  });
  const vendorDeleteMutation = useMutation({
    mutationFn: deleteVendor,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["maintenance", "vendors"] }),
  });

  const documentCreateMutation = useMutation({
    mutationFn: ({ vehicleId, payload }: { vehicleId: number; payload: Record<string, unknown> }) =>
      createVehicleDocument(vehicleId, payload),
    onSuccess: async () =>
      queryClient.invalidateQueries({ queryKey: ["maintenance", "vehicle_documents", documentsState.vehicle_id] }),
  });
  const documentUpdateMutation = useMutation({
    mutationFn: ({ vehicleId, documentId, payload }: { vehicleId: number; documentId: number; payload: Record<string, unknown> }) =>
      updateVehicleDocument(vehicleId, documentId, payload),
    onSuccess: async () =>
      queryClient.invalidateQueries({ queryKey: ["maintenance", "vehicle_documents", documentsState.vehicle_id] }),
  });

  const workOrders = useMemo(() => asList(workOrdersQuery.data), [workOrdersQuery.data]);
  const selectedWorkOrder = useMemo(
    () => (selectedWorkOrderQuery.data && typeof selectedWorkOrderQuery.data === "object" ? (selectedWorkOrderQuery.data as Record<string, unknown>) : null),
    [selectedWorkOrderQuery.data]
  );

  const reportsData = useMemo(
    () => (maintenanceReportQuery.data && typeof maintenanceReportQuery.data === "object" ? (maintenanceReportQuery.data as Record<string, unknown>) : {}),
    [maintenanceReportQuery.data]
  );

  const kpis = useMemo(() => {
    const openByPriority = asList(reportsData.open_work_orders_by_priority ?? reportsData.open_by_priority);
    const criticalOpen = openByPriority
      .filter((x) => String((x.priority ?? "")).toLowerCase() === "critical")
      .reduce((sum, row) => sum + asNumber(row.count), 0);
    const highOpen = openByPriority
      .filter((x) => String((x.priority ?? "")).toLowerCase() === "high")
      .reduce((sum, row) => sum + asNumber(row.count), 0);

    return {
      criticalOpen,
      highOpen,
      overdue: asNumber(reportsData.overdue_count),
      vehiclesInMaintenance: asNumber(reportsData.vehicles_in_maintenance),
      monthlySpend: asNumber(reportsData.monthly_spend),
      quarterlySpend: asNumber(reportsData.quarterly_spend),
      avgCompletionHours: asNumber(reportsData.avg_completion_hours),
    };
  }, [reportsData]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <p className="ops-section-title">Operations</p>
        <h2 className="text-lg font-semibold md:text-xl">Maintenance</h2>
        <p className="text-sm text-muted-foreground">Work orders, service schedules, documents, vendors and maintenance analytics.</p>
      </div>

      <section className="flex flex-wrap gap-2">
        {tabs.map((item) => {
          const active = item.key === tab;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={[
                "rounded-md border px-3 py-1.5 text-sm font-semibold transition",
                active ? "border-primary/40 bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {item.label}
            </button>
          );
        })}
      </section>

      {tab === "due" ? (
        <div className="space-y-4">
          <section className="ops-card p-4">
            <div className="grid gap-3 md:grid-cols-4">
              <select
                value={dueFilters.priority}
                onChange={(e) => setDueFilters((p) => ({ ...p, priority: e.target.value }))}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                <option value="">All priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select
                value={dueFilters.vehicle_id}
                onChange={(e) => setDueFilters((p) => ({ ...p, vehicle_id: e.target.value }))}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                <option value="">All vehicles</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name}
                  </option>
                ))}
              </select>
              <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={dueFilters.overdue_only}
                  onChange={(e) => setDueFilters((p) => ({ ...p, overdue_only: e.target.checked }))}
                  className="h-4 w-4 accent-primary"
                />
                Overdue only
              </label>
            </div>
          </section>

          {dueQuery.isLoading ? <Loading /> : null}
          {dueQuery.isError ? <Error /> : null}
          {!dueQuery.isLoading && !dueQuery.isError ? (
            asList(dueQuery.data).length === 0 ? (
              <Empty label="due maintenance items" />
            ) : (
              <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {asList(dueQuery.data).map((row, idx) => {
                  const id = String(row.id ?? idx);
                  const dueRaw = pickFirst(row, [
                    "due_date",
                    "scheduled_date",
                    "next_due_at",
                    "next_due_date",
                    "maintenance_schedule.next_due_at",
                    "schedule.next_due_at",
                  ]);
                  const dueDateText = toText(dueRaw, "-");
                  const overdue =
                    Boolean(row.overdue ?? row.is_overdue) ||
                    String(row.status ?? "").toLowerCase() === "overdue" ||
                    (dueDateText !== "-" &&
                      Number.isFinite(new Date(dueDateText).getTime()) &&
                      new Date(dueDateText).getTime() < nowTs);
                  const priority = toText(
                    pickFirst(row, ["priority", "maintenance_schedule.priority", "schedule.priority"]),
                    "medium"
                  );
                  const taskTitle = toText(
                    pickFirst(row, [
                      "task",
                      "title",
                      "type",
                      "name",
                      "maintenance_type",
                      "maintenance_schedule.name",
                      "schedule.name",
                    ]),
                    "Maintenance Task"
                  );
                  const vehicleText = toText(
                    pickFirst(row, [
                      "vehicle_name",
                      "vehicle.license_plate",
                      "vehicle.name",
                      "vehicle.reg_no",
                      "vehicle.truck_reg_no",
                      "vehicle_id",
                    ])
                  );
                  return (
                    <article key={id} className="ops-card p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-foreground">{taskTitle}</p>
                        <span className={["rounded-full border px-2 py-0.5 text-[11px] font-semibold", urgencyClass(priority, overdue)].join(" ")}>
                          {overdue ? "Overdue" : priority}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">Vehicle: {vehicleText}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Due: {dueDateText}</p>
                    </article>
                  );
                })}
              </section>
            )
          ) : null}
        </div>
      ) : null}

      {tab === "work_orders" ? (
        <div className="space-y-4">
          <section className="ops-card p-4">
            <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
              <input
                value={woFilters.q}
                onChange={(e) => setWoFilters((p) => ({ ...p, q: e.target.value, page: 1 }))}
                placeholder="Search WO # / vehicle / assignee"
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm xl:col-span-2"
              />
              <select value={woFilters.status} onChange={(e) => setWoFilters((p) => ({ ...p, status: e.target.value, page: 1 }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <option value="">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select value={woFilters.priority} onChange={(e) => setWoFilters((p) => ({ ...p, priority: e.target.value, page: 1 }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <option value="">All Priority</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select value={woFilters.vehicle_id} onChange={(e) => setWoFilters((p) => ({ ...p, vehicle_id: e.target.value, page: 1 }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <option value="">All Vehicles</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>
                ))}
              </select>
              <select value={woFilters.sort_by} onChange={(e) => setWoFilters((p) => ({ ...p, sort_by: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <option value="scheduled_date">Scheduled Date</option>
                <option value="priority">Priority</option>
                <option value="status">Status</option>
                <option value="actual_cost">Actual Cost</option>
              </select>
              <select value={woFilters.sort_order} onChange={(e) => setWoFilters((p) => ({ ...p, sort_order: e.target.value as "asc" | "desc" }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
              <select value={String(woFilters.per_page)} onChange={(e) => setWoFilters((p) => ({ ...p, per_page: Number(e.target.value), page: 1 }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <option value="10">10 / page</option>
                <option value="20">20 / page</option>
                <option value="50">50 / page</option>
              </select>
            </div>
          </section>

          <section className="ops-card p-4">
            <h3 className="mb-3 text-sm font-semibold">Create / Update Work Order</h3>
            <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              Preventive work orders are automated from maintenance schedules. Manual creation is limited to corrective and emergency work orders.
            </div>
            <form
              className="grid gap-3 md:grid-cols-4"
              onSubmit={(e) => {
                e.preventDefault();
                setWoFormMessage("");
                if (!selectedWorkOrderId && woForm.type === "preventive") {
                  setWoFormMessage("Preventive work orders are auto-generated. Use corrective/emergency or create a schedule template.");
                  return;
                }
                const payload = {
                  vehicle_id: woForm.vehicle_id ? Number(woForm.vehicle_id) : undefined,
                  type: woForm.type,
                  status: woForm.status,
                  priority: woForm.priority,
                  assigned_to: woForm.assigned_to ? Number(woForm.assigned_to) : undefined,
                  scheduled_date: woForm.scheduled_date || undefined,
                  description: woForm.description || undefined,
                  actual_cost: woForm.actual_cost ? Number(woForm.actual_cost) : undefined,
                };
                if (selectedWorkOrderId) {
                  updateWorkOrderMutation.mutate({ id: selectedWorkOrderId, payload });
                } else {
                  createWorkOrderMutation.mutate(payload);
                }
              }}
            >
              <select value={woForm.vehicle_id} onChange={(e) => setWoForm((p) => ({ ...p, vehicle_id: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <option value="">Vehicle</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              <select value={woForm.type} onChange={(e) => setWoForm((p) => ({ ...p, type: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <option value="corrective">corrective</option>
                <option value="emergency">emergency</option>
                {selectedWorkOrderId ? <option value="preventive">preventive</option> : null}
              </select>
              <select value={woForm.status} onChange={(e) => setWoForm((p) => ({ ...p, status: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <option value="open">open</option>
                <option value="in_progress">in_progress</option>
                <option value="completed">completed</option>
                <option value="cancelled">cancelled</option>
              </select>
              <select value={woForm.priority} onChange={(e) => setWoForm((p) => ({ ...p, priority: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <option value="critical">critical</option>
                <option value="high">high</option>
                <option value="medium">medium</option>
                <option value="low">low</option>
              </select>
              <select value={woForm.assigned_to} onChange={(e) => setWoForm((p) => ({ ...p, assigned_to: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <option value="">Assigned To</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name ?? u.email}</option>)}
              </select>
              <input type="datetime-local" value={woForm.scheduled_date} onChange={(e) => setWoForm((p) => ({ ...p, scheduled_date: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
              <input type="number" value={woForm.actual_cost} onChange={(e) => setWoForm((p) => ({ ...p, actual_cost: e.target.value }))} placeholder="Actual Cost" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
              <input value={woForm.description} onChange={(e) => setWoForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description" className="rounded-lg border border-border bg-card px-3 py-2 text-sm md:col-span-2" />
              <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground" disabled={createWorkOrderMutation.isPending || updateWorkOrderMutation.isPending}>
                {selectedWorkOrderId ? "Update Work Order" : "Create Work Order"}
              </button>
            </form>
            {woFormMessage ? (
              <p className="mt-3 rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                {woFormMessage}
              </p>
            ) : null}
          </section>

          {workOrdersQuery.isLoading ? <Loading /> : null}
          {workOrdersQuery.isError ? <Error /> : null}
          {!workOrdersQuery.isLoading && !workOrdersQuery.isError ? (
            workOrders.length === 0 ? (
              <Empty label="work orders" />
            ) : (
              <section className="ops-card overflow-hidden">
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[1100px] text-sm">
                    <thead className="bg-muted/60 text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">WO Number</th>
                        <th className="px-4 py-3">Vehicle</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Priority</th>
                        <th className="px-4 py-3">Assigned</th>
                        <th className="px-4 py-3">Scheduled Date</th>
                        <th className="px-4 py-3">Actual Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workOrders.map((row, idx) => {
                        const id = Number(row.id ?? row.work_order_id ?? idx);
                        const woNumber = toText(
                          pickFirst(row, ["wo_number", "number", "work_order_number", "id"]),
                          `WO-${id}`
                        );
                        const vehicleText = toText(
                          pickFirst(row, [
                            "vehicle_name",
                            "vehicle.license_plate",
                            "vehicle.name",
                            "vehicle.reg_no",
                            "vehicle.truck_reg_no",
                            "vehicle_id",
                          ])
                        );
                        const woType = toText(pickFirst(row, ["type", "work_type", "category"]));
                        const woStatus = toText(pickFirst(row, ["status", "current_status"]));
                        const woPriority = toText(pickFirst(row, ["priority", "severity"]), "medium");
                        const woAssigned = toText(
                          pickFirst(row, ["assigned_name", "assigned_to_name", "assigned_to_user.name", "assignee.name", "assigned_to"])
                        );
                        const woScheduled = toText(
                          pickFirst(row, ["scheduled_date", "scheduled_for", "scheduled_at", "planned_date"])
                        );
                        const woCost = asNumber(
                          pickFirst(row, ["actual_cost", "cost_actual", "total_cost", "cost"])
                        );
                        return (
                          <tr key={id} className="cursor-pointer border-t border-border/80 hover:bg-accent/30" onClick={() => setSelectedWorkOrderId(id)}>
                            <td className="px-4 py-3 font-semibold">{woNumber}</td>
                            <td className="px-4 py-3 text-muted-foreground">{vehicleText}</td>
                            <td className="px-4 py-3 text-muted-foreground">{woType}</td>
                            <td className="px-4 py-3 text-muted-foreground">{woStatus}</td>
                            <td className="px-4 py-3"><span className={["rounded-full border px-2 py-0.5 text-xs", urgencyClass(woPriority, false)].join(" ")}>{woPriority}</span></td>
                            <td className="px-4 py-3 text-muted-foreground">{woAssigned}</td>
                            <td className="px-4 py-3 text-muted-foreground">{woScheduled}</td>
                            <td className="px-4 py-3 text-muted-foreground">{woCost.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-2 p-3 md:hidden">
                  {workOrders.map((row, idx) => {
                    const id = Number(row.id ?? row.work_order_id ?? idx);
                    const woNumber = toText(
                      pickFirst(row, ["wo_number", "number", "work_order_number", "id"]),
                      `WO-${id}`
                    );
                    const vehicleText = toText(
                      pickFirst(row, [
                        "vehicle_name",
                        "vehicle.license_plate",
                        "vehicle.name",
                        "vehicle.reg_no",
                        "vehicle.truck_reg_no",
                        "vehicle_id",
                      ])
                    );
                    const woStatus = toText(pickFirst(row, ["status", "current_status"]));
                    const woPriority = toText(pickFirst(row, ["priority", "severity"]), "medium");
                    const woCost = asNumber(
                      pickFirst(row, ["actual_cost", "cost_actual", "total_cost", "cost"])
                    );
                    return (
                      <article key={id} className="rounded-lg border border-border bg-card p-3" onClick={() => setSelectedWorkOrderId(id)}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-foreground">{woNumber}</p>
                          <span className={["rounded-full border px-2 py-0.5 text-[11px]", urgencyClass(woPriority, false)].join(" ")}>{woPriority}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{vehicleText}</p>
                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{woStatus}</span>
                          <span>{woCost.toFixed(2)}</span>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground">
                  <span>Page {woFilters.page}</span>
                  <div className="flex gap-2">
                    <button type="button" className="rounded border border-border px-2 py-1" onClick={() => setWoFilters((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}>
                      Prev
                    </button>
                    <button type="button" className="rounded border border-border px-2 py-1" onClick={() => setWoFilters((p) => ({ ...p, page: p.page + 1 }))}>
                      Next
                    </button>
                  </div>
                </div>
              </section>
            )
          ) : null}

          {selectedWorkOrderId ? (
            <section className="ops-card p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Work Order Details</h3>
                <button type="button" className="rounded border border-border px-2 py-1 text-xs" onClick={() => setSelectedWorkOrderId(null)}>
                  Close
                </button>
              </div>

              {selectedWorkOrderQuery.isLoading ? <Loading /> : null}
              {selectedWorkOrderQuery.isError ? <Error /> : null}
              {selectedWorkOrder ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Kpi label="Status" value={String(selectedWorkOrder.status ?? "-")} tone="green" />
                    <Kpi label="Priority" value={String(selectedWorkOrder.priority ?? "-")} tone={String(selectedWorkOrder.priority).toLowerCase() === "critical" ? "red" : "amber"} />
                    <Kpi label="Actual Cost" value={asNumber(selectedWorkOrder.actual_cost).toFixed(2)} tone="amber" />
                    <Kpi label="Downtime (hrs)" value={asNumber(selectedWorkOrder.downtime_hours ?? selectedWorkOrder.downtime).toFixed(2)} tone="red" />
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Timeline</p>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        {asList(selectedWorkOrder.timeline ?? selectedWorkOrder.events).map((row, idx) => (
                          <div key={idx} className="rounded border border-border px-2 py-1.5">
                            <p className="text-foreground">{String(row.title ?? row.event ?? row.status ?? "Event")}</p>
                            <p className="text-xs">{String(row.timestamp ?? row.created_at ?? "-")}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Comments</p>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        {asList(selectedWorkOrder.comments).map((row, idx) => (
                          <div key={idx} className="rounded border border-border px-2 py-1.5">
                            <p className="text-foreground">{String(row.comment ?? row.body ?? "")}</p>
                            <p className="text-xs">{String(row.created_at ?? "-")}</p>
                          </div>
                        ))}
                      </div>
                      <form
                        className="mt-3 flex gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          const comment = String(formData.get("comment") ?? "").trim();
                          if (!comment) return;
                          commentMutation.mutate({ id: selectedWorkOrderId, comment });
                          e.currentTarget.reset();
                        }}
                      >
                        <input name="comment" placeholder="Add comment" className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm" />
                        <button type="submit" className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Add</button>
                      </form>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Parts</p>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        {asList(selectedWorkOrder.parts).map((row, idx) => (
                          <div key={idx} className="rounded border border-border px-2 py-1.5">
                            <p className="text-foreground">{String(row.name ?? row.part_name ?? "Part")}</p>
                            <p className="text-xs">Qty {asNumber(row.quantity)} · Cost {asNumber(row.cost).toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                      <form
                        className="mt-3 grid gap-2 sm:grid-cols-3"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const fd = new FormData(e.currentTarget);
                          partMutation.mutate({
                            id: selectedWorkOrderId,
                            payload: {
                              name: String(fd.get("name") ?? ""),
                              quantity: asNumber(fd.get("quantity")),
                              cost: asNumber(fd.get("cost")),
                            },
                          });
                          e.currentTarget.reset();
                        }}
                      >
                        <input name="name" placeholder="Part" className="rounded border border-border bg-background px-2 py-1.5 text-sm" />
                        <input name="quantity" type="number" placeholder="Qty" className="rounded border border-border bg-background px-2 py-1.5 text-sm" />
                        <input name="cost" type="number" step="0.01" placeholder="Cost" className="rounded border border-border bg-background px-2 py-1.5 text-sm" />
                        <button type="submit" className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground sm:col-span-3">Add Part</button>
                      </form>
                    </div>

                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Transitions & Schedules</p>
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {[
                            "open",
                            "in_progress",
                            "completed",
                            "cancelled",
                          ].map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => transitionMutation.mutate({ id: selectedWorkOrderId, status })}
                              className="rounded border border-border px-2 py-1 text-xs"
                            >
                              Set {status}
                            </button>
                          ))}
                        </div>
                        <form
                          className="grid gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData(e.currentTarget);
                            scheduleTemplateMutation.mutate({
                              name: String(fd.get("name") ?? ""),
                              vehicle_id: asNumber(fd.get("vehicle_id")),
                              interval_days: asNumber(fd.get("interval_days")),
                              work_order_id: selectedWorkOrderId,
                              apply_now: true,
                            });
                            e.currentTarget.reset();
                          }}
                        >
                          <input name="name" placeholder="Template name" className="rounded border border-border bg-background px-2 py-1.5 text-sm" />
                          <input name="vehicle_id" type="number" placeholder="Vehicle ID" className="rounded border border-border bg-background px-2 py-1.5 text-sm" />
                          <input name="interval_days" type="number" placeholder="Interval days" className="rounded border border-border bg-background px-2 py-1.5 text-sm" />
                          <button type="submit" className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Create + Apply Template</button>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      ) : null}

      {tab === "vendors" ? (
        <div className="space-y-4">
          <section className="ops-card p-4">
            <h3 className="mb-3 text-sm font-semibold">Create / Update Vendor</h3>
            <form
              className="grid gap-3 md:grid-cols-5"
              onSubmit={(e) => {
                e.preventDefault();
                const payload = {
                  name: vendorForm.name,
                  contact_person: vendorForm.contact_person || undefined,
                  phone: vendorForm.phone || undefined,
                  email: vendorForm.email || undefined,
                };
                if (vendorForm.id) {
                  vendorUpdateMutation.mutate({ id: Number(vendorForm.id), payload });
                } else {
                  vendorCreateMutation.mutate(payload);
                }
              }}
            >
              <input value={vendorForm.name} onChange={(e) => setVendorForm((p) => ({ ...p, name: e.target.value }))} placeholder="Vendor name" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
              <input value={vendorForm.contact_person} onChange={(e) => setVendorForm((p) => ({ ...p, contact_person: e.target.value }))} placeholder="Contact person" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
              <input value={vendorForm.phone} onChange={(e) => setVendorForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
              <input value={vendorForm.email} onChange={(e) => setVendorForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
              <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
                {vendorForm.id ? "Update Vendor" : "Create Vendor"}
              </button>
            </form>
          </section>

          {vendorsQuery.isLoading ? <Loading /> : null}
          {vendorsQuery.isError ? <Error /> : null}
          {!vendorsQuery.isLoading && !vendorsQuery.isError ? (
            asList(vendorsQuery.data).length === 0 ? (
              <Empty label="vendors" />
            ) : (
              <section className="ops-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-muted/60 text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Contact</th>
                        <th className="px-4 py-3">Phone</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {asList(vendorsQuery.data).map((row, idx) => {
                        const id = Number(row.id ?? idx);
                        return (
                          <tr key={id} className="border-t border-border/80">
                            <td className="px-4 py-3 font-semibold">{String(row.name ?? "-")}</td>
                            <td className="px-4 py-3 text-muted-foreground">{String(row.contact_person ?? "-")}</td>
                            <td className="px-4 py-3 text-muted-foreground">{String(row.phone ?? "-")}</td>
                            <td className="px-4 py-3 text-muted-foreground">{String(row.email ?? "-")}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  className="rounded border border-border px-2 py-1 text-xs"
                                  onClick={() =>
                                    setVendorForm({
                                      id: String(id),
                                      name: String(row.name ?? ""),
                                      contact_person: String(row.contact_person ?? ""),
                                      phone: String(row.phone ?? ""),
                                      email: String(row.email ?? ""),
                                    })
                                  }
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs text-rose-300"
                                  onClick={() => vendorDeleteMutation.mutate(id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )
          ) : null}
        </div>
      ) : null}

      {tab === "documents" ? (
        <div className="space-y-4">
          <section className="ops-card p-4">
            <div className="grid gap-3 md:grid-cols-6">
              <select value={documentsState.vehicle_id} onChange={(e) => setDocumentsState((p) => ({ ...p, vehicle_id: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <option value="">Select vehicle</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              <input value={documentsState.title} onChange={(e) => setDocumentsState((p) => ({ ...p, title: e.target.value }))} placeholder="Title" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
              <input value={documentsState.type} onChange={(e) => setDocumentsState((p) => ({ ...p, type: e.target.value }))} placeholder="Type" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
              <input type="date" value={documentsState.expiry_date} onChange={(e) => setDocumentsState((p) => ({ ...p, expiry_date: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
              <input value={documentsState.file_url} onChange={(e) => setDocumentsState((p) => ({ ...p, file_url: e.target.value }))} placeholder="File URL" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
              <button
                type="button"
                className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                onClick={() => {
                  if (!documentsState.vehicle_id) return;
                  const payload = {
                    title: documentsState.title,
                    type: documentsState.type,
                    expiry_date: documentsState.expiry_date || undefined,
                    file_url: documentsState.file_url || undefined,
                  };
                  if (documentsState.id) {
                    documentUpdateMutation.mutate({
                      vehicleId: Number(documentsState.vehicle_id),
                      documentId: Number(documentsState.id),
                      payload,
                    });
                  } else {
                    documentCreateMutation.mutate({ vehicleId: Number(documentsState.vehicle_id), payload });
                  }
                }}
              >
                {documentsState.id ? "Update Doc" : "Add Doc"}
              </button>
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className="ops-card p-4">
              <h3 className="mb-2 text-sm font-semibold">Vehicle Documents</h3>
              {!documentsState.vehicle_id ? (
                <Empty label="documents (select vehicle)" />
              ) : vehicleDocsQuery.isLoading ? (
                <Loading />
              ) : vehicleDocsQuery.isError ? (
                <Error />
              ) : asList(vehicleDocsQuery.data).length === 0 ? (
                <Empty label="documents" />
              ) : (
                <div className="space-y-2">
                  {asList(vehicleDocsQuery.data).map((doc, idx) => {
                    const id = Number(doc.id ?? idx);
                    const expiry = String(doc.expiry_date ?? doc.expiry ?? "-");
                    const isOverdue = expiry !== "-" && new Date(expiry).getTime() < nowTs;
                    return (
                      <article key={id} className="rounded border border-border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-foreground">{String(doc.title ?? doc.name ?? "Document")}</p>
                            <p className="text-xs text-muted-foreground">{String(doc.type ?? "-")} · Expiry: {expiry}</p>
                          </div>
                          <span className={["rounded-full border px-2 py-0.5 text-[11px] font-semibold", urgencyClass(isOverdue ? "critical" : "low", isOverdue)].join(" ")}>
                            {isOverdue ? "Overdue" : "Valid"}
                          </span>
                        </div>
                        <div className="mt-2">
                          <button
                            type="button"
                            className="rounded border border-border px-2 py-1 text-xs"
                            onClick={() =>
                              setDocumentsState((p) => ({
                                ...p,
                                id: String(id),
                                title: String(doc.title ?? doc.name ?? ""),
                                type: String(doc.type ?? ""),
                                expiry_date: String(doc.expiry_date ?? ""),
                                file_url: String(doc.file_url ?? ""),
                              }))
                            }
                          >
                            Edit
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="ops-card p-4">
              <h3 className="mb-2 text-sm font-semibold">Expiring Board</h3>
              {expiringDocsQuery.isLoading ? <Loading /> : null}
              {expiringDocsQuery.isError ? <Error /> : null}
              {!expiringDocsQuery.isLoading && !expiringDocsQuery.isError ? (
                asList(expiringDocsQuery.data).length === 0 ? (
                  <Empty label="expiring documents" />
                ) : (
                  <div className="space-y-2">
                    {asList(expiringDocsQuery.data).map((doc, idx) => (
                      <article key={idx} className="rounded border border-border p-3">
                        <p className="font-semibold text-foreground">{String(doc.title ?? doc.name ?? "Document")}</p>
                        <p className="text-xs text-muted-foreground">{String(doc.vehicle_name ?? doc.vehicle ?? "-")} · {String(doc.expiry_date ?? "-")}</p>
                      </article>
                    ))}
                  </div>
                )
              ) : null}
            </section>
          </div>
        </div>
      ) : null}

      {tab === "reports" ? (
        <div className="space-y-4">
          {maintenanceReportQuery.isLoading ? <Loading /> : null}
          {maintenanceReportQuery.isError ? <Error /> : null}
          {!maintenanceReportQuery.isLoading && !maintenanceReportQuery.isError ? (
            <>
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
                <Kpi label="Critical Open" value={String(kpis.criticalOpen)} tone="red" />
                <Kpi label="High Open" value={String(kpis.highOpen)} tone="amber" />
                <Kpi label="Overdue" value={String(kpis.overdue)} tone="red" />
                <Kpi label="Vehicles in Maint." value={String(kpis.vehiclesInMaintenance)} tone="amber" />
                <Kpi label="Monthly Spend" value={kpis.monthlySpend.toFixed(2)} tone="green" />
                <Kpi label="Quarterly Spend" value={kpis.quarterlySpend.toFixed(2)} tone="green" />
                <Kpi label="Avg Completion Hrs" value={kpis.avgCompletionHours.toFixed(2)} tone="green" />
              </section>

              <section className="ops-card p-4">
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <select value={reportVehicleId} onChange={(e) => setReportVehicleId(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                    <option value="">Select vehicle for maintenance history</option>
                    {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
              </section>

              {reportVehicleId ? (
                <section className="ops-card p-4">
                  <h3 className="mb-2 text-sm font-semibold">Vehicle Maintenance History</h3>
                  {vehicleHistoryQuery.isLoading ? <Loading /> : null}
                  {vehicleHistoryQuery.isError ? <Error /> : null}
                  {!vehicleHistoryQuery.isLoading && !vehicleHistoryQuery.isError ? (
                    asList(vehicleHistoryQuery.data).length === 0 ? (
                      <Empty label="maintenance history" />
                    ) : (
                      <div className="space-y-2">
                        {asList(vehicleHistoryQuery.data).map((row, idx) => (
                          <article key={idx} className="rounded border border-border p-3 text-sm">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-foreground">{String(row.wo_number ?? row.work_order ?? row.title ?? "Work Order")}</p>
                              <span className={["rounded-full border px-2 py-0.5 text-[11px]", urgencyClass(String(row.priority), false)].join(" ")}>{String(row.status ?? "-")}</span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{String(row.date ?? row.completed_at ?? row.scheduled_date ?? "-")}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Cost: {asNumber(row.actual_cost ?? row.cost).toFixed(2)}</p>
                          </article>
                        ))}
                      </div>
                    )
                  ) : null}
                </section>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
