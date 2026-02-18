"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { fetchTrips } from "@/lib/api/trips";
import { fetchUsers } from "@/lib/api/users";
import { fetchVehicles } from "@/lib/api/vehicles";
import {
  EXPENSE_CATEGORY_OPTIONS,
  getExpenseCategoryLabel,
} from "@/lib/constants/expenseCategories";
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

function mapDateTotalsFromAny(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => {
      const row = toRecord(item);
      return {
        date: String(row.date ?? row.day ?? row.label ?? "-"),
        value: toNumber(row.value ?? row.total ?? row.amount ?? row.count),
      };
    });
  }
  return Object.entries(toRecord(value)).map(([date, raw]) => ({
    date,
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

function getOverviewMetrics(activeData: Record<string, unknown>) {
  const trips = toRecord(activeData.trips);
  const expenses = toRecord(activeData.expenses);
  const efficiency = toRecord(activeData.efficiency);

  const totalTrips = toNumber(
    activeData.total_trips ??
      activeData.trips_total ??
      activeData.trip_total ??
      trips.total
  );
  const completedTrips = toNumber(
    activeData.completed_trips ??
      activeData.trips_completed ??
      trips.completed
  );
  const completionRate = toNumber(
    activeData.completion_rate ??
      activeData.completion_rate_pct ??
      trips.completion_rate_pct ??
      (totalTrips > 0 ? (completedTrips / totalTrips) * 100 : 0)
  );
  const totalDistance = toNumber(
    activeData.total_distance ??
      activeData.total_distance_km ??
      trips.total_distance_km
  );
  const totalExpense = toNumber(
    activeData.total_expense ??
      activeData.expense_total ??
      expenses.total
  );
  const costPerKm = toNumber(
    activeData.cost_per_km ??
      efficiency.cost_per_km ??
      (totalDistance > 0 ? totalExpense / totalDistance : 0)
  );

  return { totalTrips, completedTrips, completionRate, totalDistance, totalExpense, costPerKm };
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
      {rows.length === 0 ? (
        <div className="px-4 py-6 text-sm text-muted-foreground">No rows available.</div>
      ) : (
        <>
          <div className="space-y-2 p-3 md:hidden">
            {rows.map((row, idx) => (
              <article key={`${title}-m-${idx}`} className="rounded-lg border border-border bg-card p-3">
                <div className="space-y-1.5">
                  {columns.map((column, columnIdx) => (
                    <div key={`${title}-m-${idx}-${columnIdx}`} className="flex items-start justify-between gap-3 text-xs">
                      <span className="text-muted-foreground">{column}</span>
                      <span className="text-right text-foreground">{row[columnIdx] ?? "-"}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
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
                {rows.map((row, index) => (
                  <tr key={`${title}-${index}`} className="border-t border-border/80">
                    {row.map((cell, cellIdx) => (
                      <td key={`${title}-${index}-${cellIdx}`} className="px-4 py-3 text-muted-foreground">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
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
  const tripNameById = useMemo(
    () =>
      Object.fromEntries(
        trips.map((trip) => [trip.id, String(trip.waybill_number ?? trip.reference_code ?? `Trip ${trip.id}`)])
      ),
    [trips]
  );
  const userNameById = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, String(u.name ?? u.email ?? `User ${u.id}`)])),
    [users]
  );
  const vehicleNameById = useMemo(
    () => Object.fromEntries(vehicles.map((v) => [v.id, String(v.name ?? `Vehicle ${v.id}`)])),
    [vehicles]
  );

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
      const { totalTrips, completionRate, totalDistance, totalExpense, costPerKm } = getOverviewMetrics(activeData);
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
          getExpenseCategoryLabel(String(row.category ?? "")),
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
    const { totalTrips, completedTrips, totalDistance, totalExpense, costPerKm, completionRate } =
      getOverviewMetrics(activeData);

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
    const totals = toRecord(activeData.totals);
    const timeline = toRecord(activeData.timeline);
    const dimensions = toRecord(activeData.dimensions);
    const quality = toRecord(activeData.quality);

    const statusItems = mapTotalsFromAny(
      activeData.status_breakdown ??
        activeData.statuses ??
        totals.status_breakdown ??
        totals.by_status ??
        activeData.trips
    ).filter((item) => item.label !== "total_distance_km" && item.label !== "completion_rate_pct");

    const trendRows = getArrayFromAny(activeData, ["created_completed_trend", "trend", "daily_trend"]).map((item) => {
      const row = toRecord(item);
      return [
        String(row.date ?? row.day ?? row.label ?? "-"),
        formatNumber(toNumber(row.created ?? row.created_count)),
        formatNumber(toNumber(row.completed ?? row.completed_count)),
      ];
    });
    if (trendRows.length === 0) {
      const createdMap = toRecord(
        timeline.created_daily ?? timeline.created_total ?? timeline.created ?? activeData.created_total
      );
      const completedMap = toRecord(
        timeline.completed_daily ?? timeline.completed_total ?? timeline.completed ?? activeData.completed_total
      );
      const dates = Array.from(new Set([...Object.keys(createdMap), ...Object.keys(completedMap)])).sort();
      dates.forEach((date) => {
        trendRows.push([
          date,
          formatNumber(toNumber(createdMap[date])),
          formatNumber(toNumber(completedMap[date])),
        ]);
      });
    }

    const incidentsRows = [
      ...getArrayFromAny(activeData, ["incidents", "incident_breakdown"]).map((item) => {
        const row = toRecord(item);
        return [
          String(row.type ?? row.category ?? row.label ?? "-"),
          formatNumber(toNumber(row.count ?? row.total ?? row.value)),
        ];
      }),
      ...Object.entries(
        toRecord(dimensions.by_incident ?? dimensions.by_incidents ?? activeData.incidents)
      ).map(([type, count]) => [type, formatNumber(toNumber(count))]),
    ];

    const destinationsRows = [
      ...getArrayFromAny(activeData, ["top_destinations", "destinations"]).map((item) => {
        const row = toRecord(item);
        return [
          String(row.name ?? row.destination ?? row.label ?? "-"),
          formatNumber(toNumber(row.count ?? row.trips ?? row.value)),
        ];
      }),
      ...Object.entries(
        toRecord(dimensions.by_destination ?? dimensions.by_destinations ?? activeData.destinations)
      ).map(([destination, tripsCount]) => [destination, formatNumber(toNumber(tripsCount))]),
      ...Object.entries(toRecord(activeData.destination_breakdown)).map(([destination, tripsCount]) => [
        destination || "(Blank)",
        formatNumber(toNumber(tripsCount)),
      ]),
    ];

    const tripsTotal = toNumber(activeData.total ?? totals.total);
    const incidentsTotal = toNumber(activeData.with_incidents ?? quality.with_incidents);
    const incidentRate = toNumber(activeData.incident_rate_pct ?? quality.incident_rate_pct);

    if (statusItems.length === 0 && trendRows.length === 0 && incidentsRows.length === 0 && destinationsRows.length === 0) {
      return <EmptyState />;
    }

    return (
      <div className="space-y-4">
        <section className="grid gap-3 sm:grid-cols-3">
          <MetricCard label="Trips Total" value={formatNumber(tripsTotal)} />
          <MetricCard label="Trips With Incidents" value={formatNumber(incidentsTotal)} />
          <MetricCard label="Incident Rate" value={formatPercent(incidentRate)} />
        </section>
        <div className="grid gap-4 xl:grid-cols-2">
        <TotalBars title="Status Breakdown" items={statusItems} />
        <SimpleTable title="Created vs Completed Trend" columns={["Date", "Created", "Completed"]} rows={trendRows} />
        <SimpleTable title="Incidents" columns={["Type", "Count"]} rows={incidentsRows} />
        <SimpleTable title="Top Destinations" columns={["Destination", "Trips"]} rows={destinationsRows} />
        </div>
      </div>
    );
  };

  const renderExpenses = () => {
    const totals = toRecord(activeData.totals);
    const timeline = toRecord(activeData.timeline);
    const dimensions = toRecord(activeData.dimensions);

    const categoryItems = mapTotalsFromAny(
      activeData.by_category ?? activeData.category_totals ?? activeData.categories ?? totals.by_category
    ).map((item) => ({
      ...item,
      label: getExpenseCategoryLabel(item.label),
    }));
    const statusItems = mapTotalsFromAny(
      activeData.by_status ?? activeData.status_totals ?? activeData.statuses ?? totals.by_status
    );
    const dailyRows = getArrayFromAny(activeData, ["daily_trend", "trend"]).map((item) => {
      const row = toRecord(item);
      return [
        String(row.date ?? row.day ?? row.label ?? "-"),
        formatCurrency(toNumber(row.total ?? row.amount ?? row.value)),
      ];
    });
    if (dailyRows.length === 0) {
      mapDateTotalsFromAny(timeline.daily_total).forEach((row) => {
        dailyRows.push([row.date, formatCurrency(row.value)]);
      });
    }

    const byVehicleRows = [
      ...getArrayFromAny(activeData, ["by_vehicle", "vehicles"]).map((item) => {
        const row = toRecord(item);
        return [
          String(row.vehicle_name ?? row.name ?? row.vehicle ?? row.vehicle_id ?? "-"),
          formatCurrency(toNumber(row.total ?? row.amount ?? row.value)),
        ];
      }),
      ...Object.entries(toRecord(dimensions.by_vehicle)).map(([id, value]) => [
        vehicleNameById[Number(id)] ?? `Vehicle ${id}`,
        formatCurrency(toNumber(value)),
      ]),
    ];
    const byDriverRows = [
      ...getArrayFromAny(activeData, ["by_driver", "drivers"]).map((item) => {
        const row = toRecord(item);
        return [
          String(row.driver_name ?? row.name ?? row.driver ?? row.driver_id ?? "-"),
          formatCurrency(toNumber(row.total ?? row.amount ?? row.value)),
        ];
      }),
      ...Object.entries(toRecord(dimensions.by_driver)).map(([id, value]) => [
        userNameById[Number(id)] ?? `Driver ${id}`,
        formatCurrency(toNumber(value)),
      ]),
    ];
    const byTripRows = [
      ...getArrayFromAny(activeData, ["by_trip", "trips"]).map((item) => {
        const row = toRecord(item);
        return [
          String(row.trip_reference ?? row.trip ?? row.trip_id ?? "-"),
          formatCurrency(toNumber(row.total ?? row.amount ?? row.value)),
        ];
      }),
      ...Object.entries(toRecord(dimensions.by_trip)).map(([id, value]) => [
        tripNameById[Number(id)] ?? `Trip ${id}`,
        formatCurrency(toNumber(value)),
      ]),
    ];

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
    const dimensions = toRecord(activeData.dimensions);
    const driverRowsFromArray = getArrayFromAny(activeData, ["drivers", "items", "data"]).map((item) => {
      const row = toRecord(item);
      const tripsTotal = toNumber(row.trips_total ?? row.total_trips);
      const completed = toNumber(row.trips_completed ?? row.completed_trips);
      const completionRate = toNumber(
        row.completion_rate_pct ?? row.completion_rate ?? row.completion_pct ?? (tripsTotal > 0 ? (completed / tripsTotal) * 100 : 0)
      );
      return [
        String(row.driver_name ?? row.name ?? row.driver ?? row.driver_id ?? "-"),
        formatNumber(tripsTotal),
        formatNumber(completed),
        formatPercent(completionRate),
        `${formatNumber(toNumber(row.distance_km_total ?? row.distance ?? row.total_distance_km))} km`,
        formatNumber(toNumber(row.incidents_count ?? row.incidents ?? row.incident_count)),
        formatCurrency(toNumber(row.expenses_total ?? row.expenses ?? row.total_expense)),
        formatCurrency(toNumber(row.unpaid_expenses_total ?? row.unpaid_expenses ?? row.pending_expenses_total)),
      ];
    });
    const driverTripsMap = toRecord(dimensions.by_driver_trips_total ?? activeData.by_driver_trips_total);
    const driverCompletedMap = toRecord(dimensions.by_driver_completed ?? activeData.by_driver_completed);
    const driverIncidentsMap = toRecord(dimensions.by_driver_incidents ?? activeData.by_driver_incidents);
    const driverExpensesMap = toRecord(dimensions.by_driver ?? dimensions.by_driver_expense ?? activeData.by_driver);
    const driverIds = Array.from(
      new Set([
        ...Object.keys(driverTripsMap),
        ...Object.keys(driverCompletedMap),
        ...Object.keys(driverIncidentsMap),
        ...Object.keys(driverExpensesMap),
      ])
    );
    const rows = driverRowsFromArray.length
      ? driverRowsFromArray
      : driverIds.map((id) => {
          const tripsTotal = toNumber(driverTripsMap[id]);
          const completed = toNumber(driverCompletedMap[id]);
          const incidents = toNumber(driverIncidentsMap[id]);
          const expenses = toNumber(driverExpensesMap[id]);
          const completion = tripsTotal > 0 ? (completed / tripsTotal) * 100 : 0;
          return [
            userNameById[Number(id)] ?? `Driver ${id}`,
            formatNumber(tripsTotal),
            formatNumber(completed),
            formatPercent(completion),
            `${formatNumber(0)} km`,
            formatNumber(incidents),
            formatCurrency(expenses),
            formatCurrency(0),
          ];
        });

    if (rows.length === 0) return <EmptyState />;

    return (
      <SimpleTable
        title="Driver Performance"
        columns={["Driver", "Trips Total", "Completed", "Completion %", "Distance", "Incidents", "Expenses", "Unpaid"]}
        rows={rows}
      />
    );
  };

  const renderVehicles = () => {
    const dimensions = toRecord(activeData.dimensions);
    const vehicleRowsFromArray = getArrayFromAny(activeData, ["vehicles", "items", "data"]).map((item) => {
      const row = toRecord(item);
      return [
        String(row.vehicle_name ?? row.name ?? row.vehicle ?? row.vehicle_id ?? "-"),
        String(row.license_plate ?? row.plate ?? "-"),
        formatNumber(toNumber(row.trips ?? row.total_trips ?? row.trips_total)),
        formatNumber(toNumber(row.trips_completed ?? row.completed_trips)),
        `${formatNumber(toNumber(row.distance_km_total ?? row.distance ?? row.total_distance_km))} km`,
        `${formatNumber(toNumber(row.fuel_litres_total ?? row.fuel_liters ?? row.fuel_used_liters))} L`,
        formatCurrency(toNumber(row.expenses_total ?? row.total_expense)),
        formatCurrency(toNumber(row.maintenance_total ?? row.maintenance)),
        formatCurrency(toNumber(row.repair_total ?? row.repair)),
      ];
    });
    const vehicleTripsMap = toRecord(dimensions.by_vehicle_trips ?? activeData.by_vehicle_trips);
    const vehicleDistanceMap = toRecord(dimensions.by_vehicle_distance ?? activeData.by_vehicle_distance);
    const vehicleFuelMap = toRecord(dimensions.by_vehicle_fuel_liters ?? activeData.by_vehicle_fuel_liters);
    const vehicleMaintenanceMap = toRecord(dimensions.by_vehicle_maintenance ?? activeData.by_vehicle_maintenance);
    const vehicleRepairMap = toRecord(dimensions.by_vehicle_repair ?? activeData.by_vehicle_repair);
    const vehicleIds = Array.from(
      new Set([
        ...Object.keys(vehicleTripsMap),
        ...Object.keys(vehicleDistanceMap),
        ...Object.keys(vehicleFuelMap),
        ...Object.keys(vehicleMaintenanceMap),
        ...Object.keys(vehicleRepairMap),
      ])
    );
    const rows = vehicleRowsFromArray.length
      ? vehicleRowsFromArray
      : vehicleIds.map((id) => [
          vehicleNameById[Number(id)] ?? `Vehicle ${id}`,
          "-",
          formatNumber(toNumber(vehicleTripsMap[id])),
          formatNumber(0),
          `${formatNumber(toNumber(vehicleDistanceMap[id]))} km`,
          `${formatNumber(toNumber(vehicleFuelMap[id]))} L`,
          formatCurrency(0),
          formatCurrency(toNumber(vehicleMaintenanceMap[id])),
          formatCurrency(toNumber(vehicleRepairMap[id])),
        ]);

    if (rows.length === 0) return <EmptyState />;

    return (
      <SimpleTable
        title="Vehicle Performance"
        columns={["Vehicle", "Plate", "Trips", "Completed", "Distance", "Fuel", "Expenses", "Maintenance", "Repair"]}
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
          <select
            value={filterState.category}
            onChange={(e) => setFilterState((p) => ({ ...p, category: e.target.value }))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary"
          >
            <option value="">Category</option>
            {EXPENSE_CATEGORY_OPTIONS.map((categoryOption) => (
              <option key={categoryOption.value} value={categoryOption.value}>
                {categoryOption.label}
              </option>
            ))}
          </select>
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
