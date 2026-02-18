"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { fetchTrips } from "@/lib/api/trips";
import { fetchUsers } from "@/lib/api/users";
import { fetchVehicles } from "@/lib/api/vehicles";
import {
  fetchReportsDrivers,
  fetchReportsExpenses,
  fetchReportsOverview,
  fetchReportsTrips,
  fetchReportsVehicles,
  type ReportFilters,
} from "@/lib/api/reports";

type TabKey = "overview" | "trips" | "expenses" | "drivers" | "vehicles";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "trips", label: "Trips" },
  { key: "expenses", label: "Expenses" },
  { key: "drivers", label: "Drivers" },
  { key: "vehicles", label: "Vehicles" },
];

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function getArrayFromAny(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const candidate = payload[key];
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function mapTotalsFromAny(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => {
      const row = toRecord(item);
      return {
        label: String(row.label ?? row.name ?? row.category ?? row.status ?? row.key ?? "Unknown"),
        value: toNumber(row.value ?? row.total ?? row.amount ?? row.count),
      };
    });
  }
  const map = toRecord(value);
  return Object.entries(map).map(([label, raw]) => ({
    label,
    value: toNumber(raw),
  }));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value || 0);
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function csvEscape(value: unknown) {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: Array<Array<unknown>>) {
  const content = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function LoadingState() {
  return <div className="ops-card p-6 text-sm text-muted-foreground">Loading report...</div>;
}

function ErrorState() {
  return <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-300">Unable to load report data.</div>;
}

function EmptyState() {
  return <div className="ops-card p-6 text-sm text-muted-foreground">No report data for selected filters.</div>;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="ops-card p-4">
      <p className="ops-section-title">{label}</p>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
    </article>
  );
}

function TotalBars({ title, items }: { title: string; items: Array<{ label: string; value: number }> }) {
  const maxValue = Math.max(...items.map((i) => i.value), 0);
  return (
    <section className="ops-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{item.label}</span>
              <span>{formatNumber(item.value)}</span>
            </div>
            <div className="h-2 rounded bg-muted">
              <div
                className="h-2 rounded bg-primary"
                style={{ width: `${maxValue > 0 ? Math.max(4, (item.value / maxValue) * 100) : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SimpleTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: Array<Array<string>>;
}) {
  return (
    <section className="ops-card overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[680px] w-full text-sm">
          <thead className="bg-muted/60 text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-sm text-muted-foreground">
                  No rows available.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={`${title}-${index}`} className="border-t border-border/80">
                  {row.map((cell, cellIdx) => (
                    <td key={`${title}-${index}-${cellIdx}`} className="px-4 py-3 text-muted-foreground">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function ReportsPage() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [filterState, setFilterState] = useState({
    date_from: "",
    date_to: "",
    status: "",
    category: "",
    trip_id: "",
    vehicle_id: "",
    driver_id: "",
  });

  const filters = useMemo<ReportFilters>(
    () => ({
      date_from: filterState.date_from || undefined,
      date_to: filterState.date_to || undefined,
      status: filterState.status || undefined,
      category: filterState.category || undefined,
      trip_id: filterState.trip_id ? Number(filterState.trip_id) : undefined,
      vehicle_id: filterState.vehicle_id ? Number(filterState.vehicle_id) : undefined,
      driver_id: filterState.driver_id ? Number(filterState.driver_id) : undefined,
    }),
    [filterState]
  );

  const { data: trips = [] } = useQuery({ queryKey: ["trips", "report-filters"], queryFn: fetchTrips });
  const { data: users = [] } = useQuery({ queryKey: ["users", "report-filters"], queryFn: fetchUsers });
  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles", "report-filters"], queryFn: fetchVehicles });

  const overviewQuery = useQuery({
    queryKey: ["reports", "overview", filters],
    queryFn: () => fetchReportsOverview(filters),
    enabled: tab === "overview",
  });
  const tripsQuery = useQuery({
    queryKey: ["reports", "trips", filters],
    queryFn: () => fetchReportsTrips(filters),
    enabled: tab === "trips",
  });
  const expensesQuery = useQuery({
    queryKey: ["reports", "expenses", filters],
    queryFn: () => fetchReportsExpenses(filters),
    enabled: tab === "expenses",
  });
  const driversQuery = useQuery({
    queryKey: ["reports", "drivers", filters],
    queryFn: () => fetchReportsDrivers(filters),
    enabled: tab === "drivers",
  });
  const vehiclesQuery = useQuery({
    queryKey: ["reports", "vehicles", filters],
    queryFn: () => fetchReportsVehicles(filters),
    enabled: tab === "vehicles",
  });

  const activeQuery =
    tab === "overview"
      ? overviewQuery
      : tab === "trips"
      ? tripsQuery
      : tab === "expenses"
      ? expensesQuery
      : tab === "drivers"
      ? driversQuery
      : vehiclesQuery;

  const activeData = toRecord(activeQuery.data);

  const exportCurrentTab = () => {
    const filename = `reports-${tab}.csv`;

    if (tab === "overview") {
      const totalTrips = toNumber(activeData.total_trips ?? activeData.trips_total ?? activeData.trip_total);
      const completedTrips = toNumber(activeData.completed_trips ?? activeData.trips_completed);
      const completionRate = toNumber(
        activeData.completion_rate ??
          (totalTrips > 0 ? (completedTrips / totalTrips) * 100 : 0)
      );
      const totalDistance = toNumber(activeData.total_distance ?? activeData.total_distance_km);
      const totalExpense = toNumber(activeData.total_expense ?? activeData.expense_total);
      const costPerKm = toNumber(activeData.cost_per_km ?? (totalDistance > 0 ? totalExpense / totalDistance : 0));
      downloadCsv(filename, [
        ["Metric", "Value"],
        ["Trips Total", totalTrips],
        ["Completion Rate (%)", completionRate.toFixed(2)],
        ["Total Distance (km)", totalDistance.toFixed(2)],
        ["Total Expense (GHS)", totalExpense.toFixed(2)],
        ["Cost per KM (GHS)", costPerKm.toFixed(2)],
      ]);
      return;
    }

    if (tab === "trips") {
      const statusItems = mapTotalsFromAny(activeData.status_breakdown ?? activeData.statuses);
      const trend = getArrayFromAny(activeData, ["created_completed_trend", "trend", "daily_trend"]).map((item) => {
        const row = toRecord(item);
        return {
          date: String(row.date ?? row.day ?? row.label ?? "-"),
          created: toNumber(row.created ?? row.created_count),
          completed: toNumber(row.completed ?? row.completed_count),
        };
      });
      downloadCsv(filename, [
        ["Section", "Label", "Value"],
        ...statusItems.map((item) => ["Status Breakdown", item.label, item.value.toFixed(2)]),
        ...trend.map((item) => ["Created/Completed Trend", `${item.date} created`, item.created.toFixed(2)]),
        ...trend.map((item) => ["Created/Completed Trend", `${item.date} completed`, item.completed.toFixed(2)]),
      ]);
      return;
    }

    if (tab === "expenses") {
      const rows = getArrayFromAny(activeData, ["by_trip", "trip_expenses", "trips"]).map((item) => {
        const row = toRecord(item);
        return [
          String(row.trip_id ?? row.trip ?? row.name ?? "-"),
          String(row.category ?? "-"),
          toNumber(row.total ?? row.amount ?? row.value).toFixed(2),
          String(row.status ?? "-"),
        ];
      });
      downloadCsv(filename, [["Trip", "Category", "Amount (GHS)", "Status"], ...rows]);
      return;
    }

    if (tab === "drivers") {
      const rows = getArrayFromAny(activeData, ["drivers", "items", "data"]).map((item) => {
        const row = toRecord(item);
        return [
          String(row.driver_name ?? row.name ?? row.driver ?? row.driver_id ?? "-"),
          toNumber(row.trips_total ?? row.total_trips).toFixed(2),
          toNumber(row.trips_completed ?? row.completed_trips).toFixed(2),
          toNumber(row.completion_rate ?? row.completion_pct).toFixed(2),
          toNumber(row.incidents ?? row.incident_count).toFixed(2),
          toNumber(row.expenses ?? row.total_expense).toFixed(2),
        ];
      });
      downloadCsv(filename, [["Driver", "Trips", "Completed", "Completion %", "Incidents", "Expenses (GHS)"], ...rows]);
      return;
    }

    const vehicleRows = getArrayFromAny(activeData, ["vehicles", "items", "data"]).map((item) => {
      const row = toRecord(item);
      return [
        String(row.vehicle_name ?? row.name ?? row.vehicle ?? row.vehicle_id ?? "-"),
        toNumber(row.trips ?? row.total_trips).toFixed(2),
        toNumber(row.distance ?? row.total_distance_km).toFixed(2),
        toNumber(row.fuel_liters ?? row.fuel_used_liters).toFixed(2),
        toNumber(row.maintenance_total ?? row.maintenance).toFixed(2),
        toNumber(row.repair_total ?? row.repair).toFixed(2),
      ];
    });
    downloadCsv(filename, [["Vehicle", "Trips", "Distance (km)", "Fuel (L)", "Maintenance (GHS)", "Repair (GHS)"], ...vehicleRows]);
  };

  const renderOverview = () => {
    const totalTrips = toNumber(activeData.total_trips ?? activeData.trips_total ?? activeData.trip_total);
    const completedTrips = toNumber(activeData.completed_trips ?? activeData.trips_completed);
    const completionRate = toNumber(activeData.completion_rate ?? (totalTrips > 0 ? (completedTrips / totalTrips) * 100 : 0));
    const totalDistance = toNumber(activeData.total_distance ?? activeData.total_distance_km);
    const totalExpense = toNumber(activeData.total_expense ?? activeData.expense_total);
    const costPerKm = toNumber(activeData.cost_per_km ?? (totalDistance > 0 ? totalExpense / totalDistance : 0));

    if ([totalTrips, completedTrips, totalDistance, totalExpense, costPerKm].every((v) => v === 0)) return <EmptyState />;

    return (
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Trip Totals" value={formatNumber(totalTrips)} />
        <MetricCard label="Completion Rate" value={formatPercent(completionRate)} />
        <MetricCard label="Total Distance" value={`${formatNumber(totalDistance)} km`} />
        <MetricCard label="Total Expense" value={formatCurrency(totalExpense)} />
        <MetricCard label="Cost / KM" value={formatCurrency(costPerKm)} />
      </section>
    );
  };

  const renderTrips = () => {
    const statusItems = mapTotalsFromAny(activeData.status_breakdown ?? activeData.statuses);
    const trendRows = getArrayFromAny(activeData, ["created_completed_trend", "trend", "daily_trend"]).map((item) => {
      const row = toRecord(item);
      return [
        String(row.date ?? row.day ?? row.label ?? "-"),
        formatNumber(toNumber(row.created ?? row.created_count)),
        formatNumber(toNumber(row.completed ?? row.completed_count)),
      ];
    });
    const incidentsRows = getArrayFromAny(activeData, ["incidents", "incident_breakdown"]).map((item) => {
      const row = toRecord(item);
      return [
        String(row.type ?? row.category ?? row.label ?? "-"),
        formatNumber(toNumber(row.count ?? row.total ?? row.value)),
      ];
    });
    const destinationsRows = getArrayFromAny(activeData, ["top_destinations", "destinations"]).map((item) => {
      const row = toRecord(item);
      return [
        String(row.name ?? row.destination ?? row.label ?? "-"),
        formatNumber(toNumber(row.count ?? row.trips ?? row.value)),
      ];
    });

    if (statusItems.length === 0 && trendRows.length === 0 && incidentsRows.length === 0 && destinationsRows.length === 0) {
      return <EmptyState />;
    }

    return (
      <div className="grid gap-4 xl:grid-cols-2">
        <TotalBars title="Status Breakdown" items={statusItems} />
        <SimpleTable title="Created vs Completed Trend" columns={["Date", "Created", "Completed"]} rows={trendRows} />
        <SimpleTable title="Incidents" columns={["Type", "Count"]} rows={incidentsRows} />
        <SimpleTable title="Top Destinations" columns={["Destination", "Trips"]} rows={destinationsRows} />
      </div>
    );
  };

  const renderExpenses = () => {
    const categoryItems = mapTotalsFromAny(activeData.by_category ?? activeData.category_totals ?? activeData.categories);
    const statusItems = mapTotalsFromAny(activeData.by_status ?? activeData.status_totals ?? activeData.statuses);
    const dailyRows = getArrayFromAny(activeData, ["daily_trend", "trend"]).map((item) => {
      const row = toRecord(item);
      return [
        String(row.date ?? row.day ?? row.label ?? "-"),
        formatCurrency(toNumber(row.total ?? row.amount ?? row.value)),
      ];
    });
    const byVehicleRows = getArrayFromAny(activeData, ["by_vehicle", "vehicles"]).map((item) => {
      const row = toRecord(item);
      return [
        String(row.vehicle_name ?? row.name ?? row.vehicle ?? row.vehicle_id ?? "-"),
        formatCurrency(toNumber(row.total ?? row.amount ?? row.value)),
      ];
    });
    const byDriverRows = getArrayFromAny(activeData, ["by_driver", "drivers"]).map((item) => {
      const row = toRecord(item);
      return [
        String(row.driver_name ?? row.name ?? row.driver ?? row.driver_id ?? "-"),
        formatCurrency(toNumber(row.total ?? row.amount ?? row.value)),
      ];
    });
    const byTripRows = getArrayFromAny(activeData, ["by_trip", "trips"]).map((item) => {
      const row = toRecord(item);
      return [
        String(row.trip_reference ?? row.trip ?? row.trip_id ?? "-"),
        formatCurrency(toNumber(row.total ?? row.amount ?? row.value)),
      ];
    });

    if (categoryItems.length === 0 && statusItems.length === 0 && dailyRows.length === 0 && byVehicleRows.length === 0 && byDriverRows.length === 0 && byTripRows.length === 0) {
      return <EmptyState />;
    }

    return (
      <div className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-2">
          <TotalBars title="Totals by Category" items={categoryItems} />
          <TotalBars title="Totals by Status" items={statusItems} />
        </div>
        <SimpleTable title="Daily Trend" columns={["Date", "Amount"]} rows={dailyRows} />
        <div className="grid gap-4 xl:grid-cols-3">
          <SimpleTable title="By Vehicle" columns={["Vehicle", "Amount"]} rows={byVehicleRows} />
          <SimpleTable title="By Driver" columns={["Driver", "Amount"]} rows={byDriverRows} />
          <SimpleTable title="By Trip" columns={["Trip", "Amount"]} rows={byTripRows} />
        </div>
      </div>
    );
  };

  const renderDrivers = () => {
    const rows = getArrayFromAny(activeData, ["drivers", "items", "data"]).map((item) => {
      const row = toRecord(item);
      return [
        String(row.driver_name ?? row.name ?? row.driver ?? row.driver_id ?? "-"),
        formatNumber(toNumber(row.trips_total ?? row.total_trips)),
        formatNumber(toNumber(row.trips_completed ?? row.completed_trips)),
        formatPercent(toNumber(row.completion_rate ?? row.completion_pct)),
        formatNumber(toNumber(row.incidents ?? row.incident_count)),
        formatCurrency(toNumber(row.expenses ?? row.total_expense)),
      ];
    });

    if (rows.length === 0) return <EmptyState />;

    return (
      <SimpleTable
        title="Driver Performance"
        columns={["Driver", "Trips Total", "Completed", "Completion %", "Incidents", "Expenses"]}
        rows={rows}
      />
    );
  };

  const renderVehicles = () => {
    const rows = getArrayFromAny(activeData, ["vehicles", "items", "data"]).map((item) => {
      const row = toRecord(item);
      return [
        String(row.vehicle_name ?? row.name ?? row.vehicle ?? row.vehicle_id ?? "-"),
        formatNumber(toNumber(row.trips ?? row.total_trips)),
        `${formatNumber(toNumber(row.distance ?? row.total_distance_km))} km`,
        `${formatNumber(toNumber(row.fuel_liters ?? row.fuel_used_liters))} L`,
        formatCurrency(toNumber(row.maintenance_total ?? row.maintenance)),
        formatCurrency(toNumber(row.repair_total ?? row.repair)),
      ];
    });

    if (rows.length === 0) return <EmptyState />;

    return (
      <SimpleTable
        title="Vehicle Performance"
        columns={["Vehicle", "Trips", "Distance", "Fuel", "Maintenance", "Repair"]}
        rows={rows}
      />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ops-section-title">Reports</p>
          <h2 className="text-xl font-semibold">Fleet Reporting</h2>
          <p className="text-sm text-muted-foreground">Operational reporting powered by backend analytics endpoints.</p>
        </div>
        <button
          type="button"
          onClick={exportCurrentTab}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <section className="ops-card p-4">
        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
          <input
            type="date"
            value={filterState.date_from}
            onChange={(e) => setFilterState((p) => ({ ...p, date_from: e.target.value }))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary"
          />
          <input
            type="date"
            value={filterState.date_to}
            onChange={(e) => setFilterState((p) => ({ ...p, date_to: e.target.value }))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary"
          />
          <input
            placeholder="Status"
            value={filterState.status}
            onChange={(e) => setFilterState((p) => ({ ...p, status: e.target.value }))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary"
          />
          <input
            placeholder="Category"
            value={filterState.category}
            onChange={(e) => setFilterState((p) => ({ ...p, category: e.target.value }))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary"
          />
          <select
            value={filterState.trip_id}
            onChange={(e) => setFilterState((p) => ({ ...p, trip_id: e.target.value }))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary"
          >
            <option value="">Trip</option>
            {trips.map((trip) => (
              <option key={trip.id} value={trip.id}>
                {(trip.waybill_number ?? trip.reference_code ?? `Trip ${trip.id}`)} ({trip.id})
              </option>
            ))}
          </select>
          <select
            value={filterState.vehicle_id}
            onChange={(e) => setFilterState((p) => ({ ...p, vehicle_id: e.target.value }))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary"
          >
            <option value="">Vehicle</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.name} ({vehicle.id})
              </option>
            ))}
          </select>
          <select
            value={filterState.driver_id}
            onChange={(e) => setFilterState((p) => ({ ...p, driver_id: e.target.value }))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary"
          >
            <option value="">Driver</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {(user.name ?? user.email)} ({user.id})
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        {tabs.map((item) => {
          const active = tab === item.key;
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

      {activeQuery.isLoading ? <LoadingState /> : null}
      {activeQuery.isError ? <ErrorState /> : null}
      {!activeQuery.isLoading && !activeQuery.isError ? (
        <>
          {tab === "overview" ? renderOverview() : null}
          {tab === "trips" ? renderTrips() : null}
          {tab === "expenses" ? renderExpenses() : null}
          {tab === "drivers" ? renderDrivers() : null}
          {tab === "vehicles" ? renderVehicles() : null}
        </>
      ) : null}
    </div>
  );
}
