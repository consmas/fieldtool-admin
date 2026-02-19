"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchFuelPrices } from "@/lib/api/fuel_prices";
import { fetchVehicles } from "@/lib/api/vehicles";
import { fetchUsers } from "@/lib/api/users";
import { fetchTrips } from "@/lib/api/trips";
import {
  createTripFuelLog,
  createVehicleFuelLog,
  fetchDriverFuelTrend,
  fetchFuelAnalysis,
  fetchFuelAnomalies,
  fetchFuelFleetReport,
  fetchFuelLogs,
  fetchVehicleFuelTrend,
  investigateFuelAnalysis,
} from "@/lib/api/fuel_analytics";

type TabKey = "prices" | "transactions" | "anomalies" | "trends" | "history";

function asRecord(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  return v as Record<string, unknown>;
}
function toNumber(v: unknown) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 2 }).format(v || 0);
}

export default function FuelHubPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>("prices");
  const [period, setPeriod] = useState({ date_from: "", date_to: "" });
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [analysisId, setAnalysisId] = useState<string | number | null>(null);
  const [analysisNote, setAnalysisNote] = useState("");
  const [logForm, setLogForm] = useState({
    scope: "vehicle",
    vehicle_id: "",
    trip_id: "",
    liters: "",
    total_cost: "",
    price_per_liter: "",
    transaction_date: "",
  });

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "prices", label: "Fuel Prices" },
    { key: "transactions", label: "Transactions" },
    { key: "anomalies", label: "Anomalies" },
    { key: "trends", label: "Trends" },
    { key: "history", label: "History & Report" },
  ];

  const { data: prices = [], isLoading: pricesLoading, isError: pricesError } = useQuery({
    queryKey: ["fuel_prices"],
    queryFn: fetchFuelPrices,
  });
  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles", "fuel-hub"], queryFn: fetchVehicles });
  const { data: drivers = [] } = useQuery({ queryKey: ["users", "fuel-hub"], queryFn: fetchUsers });
  const { data: trips = [] } = useQuery({ queryKey: ["trips", "fuel-hub"], queryFn: fetchTrips });

  const logsQuery = useQuery({
    queryKey: ["fuel", "logs", vehicleId, period],
    queryFn: () =>
      fetchFuelLogs({
        vehicle_id: vehicleId ? Number(vehicleId) : undefined,
        date_from: period.date_from || undefined,
        date_to: period.date_to || undefined,
      }),
    enabled: tab !== "prices",
  });
  const analysisQuery = useQuery({ queryKey: ["fuel", "analysis"], queryFn: () => fetchFuelAnalysis(), enabled: tab === "anomalies" });
  const anomaliesQuery = useQuery({ queryKey: ["fuel", "anomalies"], queryFn: () => fetchFuelAnomalies(), enabled: tab === "anomalies" });
  const vehicleTrendQuery = useQuery({
    queryKey: ["fuel", "trend", "vehicle", vehicleId],
    queryFn: () => fetchVehicleFuelTrend(Number(vehicleId)),
    enabled: tab === "trends" && !!vehicleId,
  });
  const driverTrendQuery = useQuery({
    queryKey: ["fuel", "trend", "driver", driverId],
    queryFn: () => fetchDriverFuelTrend(Number(driverId)),
    enabled: tab === "trends" && !!driverId,
  });
  const reportQuery = useQuery({
    queryKey: ["fuel", "report", period],
    queryFn: () => fetchFuelFleetReport(period),
    enabled: tab === "history",
  });

  const createLogMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        liters: toNumber(logForm.liters),
        total_cost: toNumber(logForm.total_cost),
        price_per_liter: toNumber(logForm.price_per_liter),
        transaction_date: logForm.transaction_date || undefined,
      };
      if (logForm.scope === "trip" && logForm.trip_id) return createTripFuelLog(Number(logForm.trip_id), payload);
      if (logForm.vehicle_id) return createVehicleFuelLog(Number(logForm.vehicle_id), payload);
      throw new Error("Pick vehicle or trip");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["fuel", "logs"] });
      setLogForm({ scope: "vehicle", vehicle_id: "", trip_id: "", liters: "", total_cost: "", price_per_liter: "", transaction_date: "" });
    },
  });

  const investigateMutation = useMutation({
    mutationFn: ({ id, note }: { id: string | number; note: string }) =>
      investigateFuelAnalysis(id, { status: "investigating", resolution_note: note || undefined }),
    onSuccess: async () => {
      setAnalysisId(null);
      setAnalysisNote("");
      await queryClient.invalidateQueries({ queryKey: ["fuel", "analysis"] });
      await queryClient.invalidateQueries({ queryKey: ["fuel", "anomalies"] });
    },
  });

  const logs = logsQuery.data?.items ?? [];
  const analysis = analysisQuery.data?.items ?? [];
  const anomalies = anomaliesQuery.data?.items ?? [];
  const unresolved = anomalies.filter((x) => !["resolved", "closed"].includes(String(x.status ?? "").toLowerCase()));
  const fuelReport = asRecord(reportQuery.data);

  const priceHistory = useMemo(() => {
    const from = period.date_from ? new Date(period.date_from).getTime() : null;
    const to = period.date_to ? new Date(period.date_to).getTime() : null;
    return [...prices].filter((p) => {
      const ts = new Date(p.effective_at).getTime();
      if (from && ts < from) return false;
      if (to && ts > to + 86400000) return false;
      return true;
    });
  }, [prices, period.date_from, period.date_to]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Fuel</p>
          <h2 className="text-lg font-semibold md:text-xl">Fuel Prices & Analytics Hub</h2>
          <p className="text-sm text-muted-foreground">Fuel prices, logs, anomalies, trends and period history in one place.</p>
        </div>
        <Link href="/fuel-prices/new" className="w-full rounded-xl bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground sm:w-auto">
          Add Fuel Price
        </Link>
      </div>

      <div className="ops-card p-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-lg border px-3 py-2 text-sm ${tab === t.key ? "border-primary/40 bg-primary/15 text-foreground" : "border-border text-muted-foreground"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "prices" ? (
        pricesLoading ? (
          <div className="ops-card p-6 text-sm text-muted-foreground">Loading...</div>
        ) : pricesError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">Unable to load fuel prices.</div>
        ) : (
          <div className="ops-card p-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <tr><th className="py-2">Price / Liter</th><th className="py-2">Effective At</th><th className="py-2">Actions</th></tr>
                </thead>
                <tbody>
                  {prices.map((price) => (
                    <tr key={price.id} className="border-t border-border">
                      <td className="py-3">{price.price_per_liter}</td>
                      <td className="py-3 text-muted-foreground">{price.effective_at}</td>
                      <td className="py-3"><Link href={`/fuel-prices/${price.id}/edit`} className="rounded-lg border border-border px-3 py-1 text-xs">Edit</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : null}

      {tab === "transactions" ? (
        <div className="space-y-4">
          <div className="ops-card p-4">
            <div className="grid gap-3 md:grid-cols-4">
              <select value={logForm.scope} onChange={(e) => setLogForm((p) => ({ ...p, scope: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <option value="vehicle">Vehicle log</option><option value="trip">Trip log</option>
              </select>
              {logForm.scope === "vehicle" ? (
                <select value={logForm.vehicle_id} onChange={(e) => setLogForm((p) => ({ ...p, vehicle_id: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                  <option value="">Select vehicle</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              ) : (
                <select value={logForm.trip_id} onChange={(e) => setLogForm((p) => ({ ...p, trip_id: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                  <option value="">Select trip</option>{trips.map((t) => <option key={t.id} value={t.id}>{`Trip #${t.id}`}</option>)}
                </select>
              )}
              <input value={logForm.liters} onChange={(e) => setLogForm((p) => ({ ...p, liters: e.target.value }))} placeholder="Liters" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
              <input value={logForm.total_cost} onChange={(e) => setLogForm((p) => ({ ...p, total_cost: e.target.value }))} placeholder="Total cost" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
              <input value={logForm.price_per_liter} onChange={(e) => setLogForm((p) => ({ ...p, price_per_liter: e.target.value }))} placeholder="Price/L" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
              <input type="datetime-local" value={logForm.transaction_date} onChange={(e) => setLogForm((p) => ({ ...p, transaction_date: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
            </div>
            <button type="button" onClick={() => createLogMutation.mutate()} disabled={createLogMutation.isPending} className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              {createLogMutation.isPending ? "Saving..." : "Create Fuel Log"}
            </button>
          </div>
          <div className="ops-card p-4">
            {logsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading logs...</p> : null}
            {!logsQuery.isLoading && logs.length === 0 ? <p className="text-sm text-muted-foreground">No fuel logs.</p> : null}
            {logs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <tr><th className="py-2">Date</th><th className="py-2">Vehicle</th><th className="py-2">Trip</th><th className="py-2">Liters</th><th className="py-2">Price/L</th><th className="py-2">Cost</th></tr>
                  </thead>
                  <tbody>{logs.map((r, i) => (
                    <tr key={String(r.id ?? i)} className="border-t border-border">
                      <td className="py-2 text-muted-foreground">{String(r.transaction_date ?? r.created_at ?? "-")}</td>
                      <td className="py-2 text-muted-foreground">{String(r.vehicle_name ?? r.vehicle_id ?? "-")}</td>
                      <td className="py-2 text-muted-foreground">{String(r.trip_id ?? "-")}</td>
                      <td className="py-2 text-muted-foreground">{toNumber(r.liters).toFixed(2)}</td>
                      <td className="py-2 text-muted-foreground">{formatCurrency(toNumber(r.price_per_liter))}</td>
                      <td className="py-2 text-muted-foreground">{formatCurrency(toNumber(r.total_cost))}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "anomalies" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="ops-card p-4">
            <h3 className="mb-2 text-sm font-semibold">Analysis Records</h3>
            {analysisQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
            <div className="space-y-2">
              {analysis.map((r, i) => {
                const id = (r.id ?? i) as string | number;
                return (
                  <div key={String(id)} className="rounded border border-border p-3 text-sm">
                    <p className="font-semibold">{String(r.title ?? r.rule_name ?? `Analysis #${id}`)}</p>
                    <p className="text-xs text-muted-foreground">{String(r.summary ?? r.message ?? "-")}</p>
                    {analysisId === id ? (
                      <div className="mt-2 space-y-2">
                        <textarea value={analysisNote} onChange={(e) => setAnalysisNote(e.target.value)} className="h-16 w-full rounded border border-border bg-card px-2 py-1 text-xs" />
                        <button type="button" onClick={() => investigateMutation.mutate({ id, note: analysisNote })} className="rounded border border-primary/40 bg-primary/15 px-2 py-1 text-xs">
                          Investigate
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setAnalysisId(id)} className="mt-2 rounded border border-border px-2 py-1 text-xs">Open Investigation</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="ops-card p-4">
            <h3 className="mb-2 text-sm font-semibold">Unresolved Anomalies</h3>
            {anomaliesQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
            <div className="space-y-2">
              {unresolved.map((r, i) => (
                <div key={String(r.id ?? i)} className="rounded border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                  <p className="font-semibold">{String(r.title ?? r.anomaly_type ?? "Anomaly")}</p>
                  <p className="text-xs text-muted-foreground">{String(r.description ?? r.details ?? "-")}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {tab === "trends" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="ops-card p-4">
            <h3 className="mb-2 text-sm font-semibold">Vehicle Trend</h3>
            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="mb-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
              <option value="">Select vehicle</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            {vehicleTrendQuery.data ? <pre className="overflow-x-auto rounded border border-border bg-card p-3 text-xs text-muted-foreground">{JSON.stringify(vehicleTrendQuery.data, null, 2)}</pre> : <p className="text-sm text-muted-foreground">Select vehicle.</p>}
          </div>
          <div className="ops-card p-4">
            <h3 className="mb-2 text-sm font-semibold">Driver Trend</h3>
            <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className="mb-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
              <option value="">Select driver</option>{drivers.map((d) => <option key={d.id} value={d.id}>{d.name ?? d.email}</option>)}
            </select>
            {driverTrendQuery.data ? <pre className="overflow-x-auto rounded border border-border bg-card p-3 text-xs text-muted-foreground">{JSON.stringify(driverTrendQuery.data, null, 2)}</pre> : <p className="text-sm text-muted-foreground">Select driver.</p>}
          </div>
        </div>
      ) : null}

      {tab === "history" ? (
        <div className="space-y-4">
          <div className="ops-card p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <input type="date" value={period.date_from} onChange={(e) => setPeriod((p) => ({ ...p, date_from: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
              <input type="date" value={period.date_to} onChange={(e) => setPeriod((p) => ({ ...p, date_to: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="ops-card p-4"><p className="ops-section-title">Total Liters</p><p className="mt-2 text-2xl font-bold">{toNumber(fuelReport.total_liters ?? asRecord(fuelReport.totals).liters).toFixed(2)}</p></div>
            <div className="ops-card p-4"><p className="ops-section-title">Total Cost</p><p className="mt-2 text-2xl font-bold">{formatCurrency(toNumber(fuelReport.total_cost ?? asRecord(fuelReport.totals).cost))}</p></div>
            <div className="ops-card p-4"><p className="ops-section-title">Avg Cost/L</p><p className="mt-2 text-2xl font-bold">{formatCurrency(toNumber(fuelReport.avg_cost_per_liter ?? asRecord(fuelReport.totals).avg_cost_per_liter))}</p></div>
            <div className="ops-card p-4"><p className="ops-section-title">Anomaly Count</p><p className="mt-2 text-2xl font-bold">{String(toNumber(fuelReport.anomaly_count ?? asRecord(fuelReport.anomalies).count))}</p></div>
          </div>
          <div className="ops-card p-4">
            <h3 className="mb-2 text-sm font-semibold">Historical Fuel Logs (period)</h3>
            {logsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
            {!logsQuery.isLoading && logs.length === 0 ? <p className="text-sm text-muted-foreground">No logs in selected period.</p> : null}
            {logs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <tr><th className="py-2">Date</th><th className="py-2">Vehicle</th><th className="py-2">Liters</th><th className="py-2">Cost</th></tr>
                  </thead>
                  <tbody>{logs.map((r, i) => (
                    <tr key={String(r.id ?? i)} className="border-t border-border">
                      <td className="py-2 text-muted-foreground">{String(r.transaction_date ?? r.created_at ?? "-")}</td>
                      <td className="py-2 text-muted-foreground">{String(r.vehicle_name ?? r.vehicle_id ?? "-")}</td>
                      <td className="py-2 text-muted-foreground">{toNumber(r.liters).toFixed(2)}</td>
                      <td className="py-2 text-muted-foreground">{formatCurrency(toNumber(r.total_cost))}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : null}
          </div>
          <div className="ops-card p-4">
            <h3 className="mb-2 text-sm font-semibold">Historical Fuel Prices (period)</h3>
            {priceHistory.length === 0 ? <p className="text-sm text-muted-foreground">No fuel prices in selected period.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <tr><th className="py-2">Effective At</th><th className="py-2">Price/L</th></tr>
                  </thead>
                  <tbody>{priceHistory.map((p) => (
                    <tr key={p.id} className="border-t border-border"><td className="py-2 text-muted-foreground">{p.effective_at}</td><td className="py-2 text-muted-foreground">{p.price_per_liter}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
