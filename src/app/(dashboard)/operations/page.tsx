"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

type VehicleOption = {
  id?: number;
  name?: string;
  license_plate?: string;
  kind?: string;
};

type OperationRecord = {
  id?: number;
  entry_date?: string;
  trip_id?: string;
  waybill_no?: string;
  truck_id?: string;
  driver_name?: string;
  status?: string;
  expected_revenue?: number | string;
};

type OperationSummary = {
  reporting_month: string;
  total_records: number;
  total_revenue: number;
  by_status: Record<string, number>;
  trucks: number;
  drivers: number;
};

const recordTypes = [
  { value: "trip", label: "Trips" },
  { value: "fleet", label: "Fleet" },
  { value: "driver", label: "Driver" },
  { value: "compliance", label: "Compliance" },
  { value: "incident", label: "Incident" },
  { value: "payment", label: "Payment" },
  { value: "kpi", label: "KPI" },
  { value: "summary", label: "Summary" },
];

async function fetchRecords(type: string) {
  const { data } = await apiClient.get(`/operation_records?record_type=${type}`);
  return data.records ?? [];
}

async function fetchSummary(month: string) {
  const { data } = await apiClient.get(`/operation_records/summary?reporting_month=${encodeURIComponent(month)}`);
  return data as OperationSummary;
}

async function fetchVehicles() {
  const { data } = await apiClient.get("/vehicles");
  return (data ?? []) as VehicleOption[];
}

async function createRecord(payload: Record<string, unknown>) {
  const { data } = await apiClient.post("/operation_records", { operation_record: payload });
  return data.record;
}

async function importRecords(formData: FormData) {
  const { data } = await apiClient.post("/operation_records/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

async function downloadTemplate() {
  const response = await apiClient.get("/operation_records/template", { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "operations_template.csv");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export default function OperationsPage() {
  const queryClient = useQueryClient();
  const [recordType, setRecordType] = useState("trip");
  const [reportingMonth, setReportingMonth] = useState("Aug 2026");
  const [form, setForm] = useState({
    entry_date: new Date().toISOString().slice(0, 10),
    reporting_month: "Aug 2026",
    trip_id: "",
    waybill_no: "",
    truck_id: "",
    driver_name: "",
    cargo_type: "",
    origin: "",
    destination: "",
    expected_revenue: "",
    status: "",
    notes: "",
  });
  const [file, setFile] = useState<File | null>(null);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["operation-records", recordType],
    queryFn: () => fetchRecords(recordType),
  });

  const { data: summaryData } = useQuery({
    queryKey: ["operation-summary", reportingMonth],
    queryFn: () => fetchSummary(reportingMonth),
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: fetchVehicles,
  });

  const createMutation = useMutation({
    mutationFn: createRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operation-records"] });
      queryClient.invalidateQueries({ queryKey: ["operation-summary"] });
      setForm((prev) => ({ ...prev, trip_id: "", waybill_no: "", truck_id: "", driver_name: "", notes: "", expected_revenue: "", status: "" }));
    },
  });

  const importMutation = useMutation({
    mutationFn: importRecords,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operation-records"] });
      queryClient.invalidateQueries({ queryKey: ["operation-summary"] });
      setFile(null);
    },
  });

  const recordSummary = useMemo(() => ({
    total: records.length,
    active: records.filter((row: OperationRecord) => String(row.status || "").toLowerCase().includes("operational")).length,
    pending: records.filter((row: OperationRecord) => String(row.status || "").toLowerCase().includes("pending")).length,
  }), [records]);

  const submit = () => {
    createMutation.mutate({
      ...form,
      record_type: recordType,
      expected_revenue: form.expected_revenue ? Number(form.expected_revenue) : 0,
    });
  };

  const submitImport = () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("record_type", recordType);
    formData.append("reporting_month", form.reporting_month);
    importMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Operations MVP</p>
            <h1 className="text-2xl font-semibold">Daily operations tracker</h1>
            <p className="mt-1 text-sm text-muted-foreground">Record basic daily operations manually and import historical Excel data when needed.</p>
          </div>
          <div className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
            <div className="font-semibold">{recordSummary.total} entries</div>
            <div className="text-muted-foreground">{recordSummary.active} active / {recordSummary.pending} pending</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Manual entry</h2>
            <select value={recordType} onChange={(e) => setRecordType(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              {recordTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Entry date</span>
              <input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Reporting month</span>
              <input value={form.reporting_month} onChange={(e) => setForm({ ...form, reporting_month: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Trip ID</span>
              <input value={form.trip_id} onChange={(e) => setForm({ ...form, trip_id: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Waybill</span>
              <input value={form.waybill_no} onChange={(e) => setForm({ ...form, waybill_no: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Truck</span>
              <select value={form.truck_id} onChange={(e) => setForm({ ...form, truck_id: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2">
                <option value="">Select truck</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id ?? vehicle.name} value={vehicle.name ?? ""}>
                    {vehicle.name}{vehicle.license_plate ? ` — ${vehicle.license_plate}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Driver</span>
              <input value={form.driver_name} onChange={(e) => setForm({ ...form, driver_name: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Cargo</span>
              <input value={form.cargo_type} onChange={(e) => setForm({ ...form, cargo_type: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Revenue</span>
              <input type="number" value={form.expected_revenue} onChange={(e) => setForm({ ...form, expected_revenue: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Origin</span>
              <input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Destination</span>
              <input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Status</span>
              <input value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
            </label>
          </div>
          <label className="mt-3 block space-y-1 text-sm">
            <span className="text-muted-foreground">Notes</span>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2" />
          </label>
          <button onClick={submit} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Save entry</button>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Import historical sheet</h2>
            <p className="mt-1 text-sm text-muted-foreground">Upload a previous CSV file and import it into the simplified operation records.</p>
            <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={submitImport} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold">Import file</button>
              <button onClick={downloadTemplate} className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground">Download template</button>
            </div>
            {importMutation.isPending && <p className="mt-2 text-sm text-muted-foreground">Importing…</p>}
            {importMutation.isSuccess && <p className="mt-2 text-sm text-emerald-600">Import completed.</p>}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Monthly summary</h2>
              <input value={reportingMonth} onChange={(e) => setReportingMonth(e.target.value)} className="w-36 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-background p-3">
                <p className="text-sm text-muted-foreground">Total records</p>
                <p className="text-xl font-semibold">{summaryData?.total_records ?? 0}</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-3">
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-xl font-semibold">{summaryData?.total_revenue ?? 0}</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-3">
                <p className="text-sm text-muted-foreground">Trucks</p>
                <p className="text-xl font-semibold">{summaryData?.trucks ?? 0}</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-3">
                <p className="text-sm text-muted-foreground">Drivers</p>
                <p className="text-xl font-semibold">{summaryData?.drivers ?? 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent entries</h2>
          <p className="text-sm text-muted-foreground">Showing the latest {records.length} records</p>
        </div>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Trip</th>
                  <th className="px-3 py-2">Truck</th>
                  <th className="px-3 py-2">Driver</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {records.map((row: OperationRecord) => (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="px-3 py-2">{row.entry_date}</td>
                    <td className="px-3 py-2">{row.trip_id || row.waybill_no || "-"}</td>
                    <td className="px-3 py-2">{row.truck_id || "-"}</td>
                    <td className="px-3 py-2">{row.driver_name || "-"}</td>
                    <td className="px-3 py-2">{row.status || "-"}</td>
                    <td className="px-3 py-2">{row.expected_revenue || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
