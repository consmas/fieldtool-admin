"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchTrips } from "@/lib/api/trips";
import { fetchUsers } from "@/lib/api/users";
import { fetchVehicles } from "@/lib/api/vehicles";
import {
  fetchAuditLogs,
  fetchAuditSummary,
  fetchDriverComplianceSummary,
  fetchReportsCompliance,
  fetchReportsDrivers,
  fetchReportsExpenses,
  fetchReportsFuel,
  fetchReportsIncidents,
  fetchReportsMaintenance,
  fetchReportsOverview,
  fetchReportsTrips,
  fetchReportsVehicles,
  markMonitoringSubmitted,
  type ReportFilters,
} from "@/lib/api/reports";

type WorkbookTabKey =
  | "checklist"
  | "master_trip_operations"
  | "fleet_status_monthly"
  | "driver_performance_monthly"
  | "insurance_compliance_tracker"
  | "incident_damage_register"
  | "fabrimetal_payment_monitoring"
  | "service_kpis_monitor"
  | "management_summary"
  | "budget";

const workbookTabs: Array<{ key: WorkbookTabKey; label: string }> = [
  { key: "checklist", label: "Monthly Monitoring Checklist" },
  { key: "master_trip_operations", label: "Master Trip Operations Table" },
  { key: "fleet_status_monthly", label: "Fleet Status (Monthly)" },
  { key: "driver_performance_monthly", label: "Driver Performance (Monthly)" },
  { key: "insurance_compliance_tracker", label: "Insurance & Compliance Tracker" },
  { key: "incident_damage_register", label: "Incident & Damage Register" },
  { key: "fabrimetal_payment_monitoring", label: "Fabrimetal Payment Monitoring" },
  { key: "service_kpis_monitor", label: "Service KPIs Monitor" },
  { key: "management_summary", label: "Management Summary" },
  { key: "budget", label: "Budget Report Format" },
];

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function toNumber(v: unknown) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toRecord(v: unknown) {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {} as Record<string, unknown>;
  return v as Record<string, unknown>;
}

function getRows(v: unknown, keys: string[]) {
  if (Array.isArray(v)) return v as Array<Record<string, unknown>>;
  const map = toRecord(v);
  for (const key of keys) {
    const candidate = map[key];
    if (Array.isArray(candidate)) return candidate as Array<Record<string, unknown>>;
  }
  return [] as Array<Record<string, unknown>>;
}

function formatDate(value: unknown) {
  const raw = String(value ?? "");
  if (!raw) return "-";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toISOString().slice(0, 10);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 2,
  }).format(value);
}

function csvEscape(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
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

function downloadXlsx(filename: string, rows: Array<Array<unknown>>) {
  const content = rows.map((row) => row.map((cell) => String(cell ?? "")).join("\t")).join("\n");
  const blob = new Blob([`\uFEFF${content}`], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function asStatus(flag: boolean) {
  return flag ? "Submitted" : "Not Submitted";
}

function buildDateRange(year: number, month: number) {
  if (month === 0) {
    return { date_from: `${year}-01-01`, date_to: `${year}-12-31` };
  }
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return {
    date_from: start.toISOString().slice(0, 10),
    date_to: end.toISOString().slice(0, 10),
  };
}

function Table({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<Array<string>>;
}) {
  if (!rows.length) return <div className="ops-card p-4 text-sm text-muted-foreground">No rows available.</div>;
  return (
    <section className="ops-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/60 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-3 py-2.5">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-t border-border/80">
                {row.map((cell, cdx) => (
                  <td key={`${idx}-${cdx}`} className="px-3 py-2.5 text-muted-foreground">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function MonitoringReportsPage() {
  const now = new Date();
  const [tab, setTab] = useState<WorkbookTabKey>("checklist");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(0);
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [preparedBy, setPreparedBy] = useState("");

  const { date_from, date_to } = useMemo(() => buildDateRange(year, month), [year, month]);
  const filters = useMemo<ReportFilters>(
    () => ({
      date_from,
      date_to,
      month: month || undefined,
      year,
      status: status || undefined,
      severity: severity || undefined,
      vehicle_id: vehicleId ? Number(vehicleId) : undefined,
      driver_id: driverId ? Number(driverId) : undefined,
    }),
    [date_from, date_to, month, year, status, severity, vehicleId, driverId]
  );

  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles", "monitoring"], queryFn: fetchVehicles });
  const { data: users = [] } = useQuery({ queryKey: ["users", "monitoring"], queryFn: fetchUsers });
  const { data: trips = [] } = useQuery({ queryKey: ["trips", "monitoring"], queryFn: fetchTrips });

  const overviewQ = useQuery({ queryKey: ["monitoring", "overview", filters], queryFn: () => fetchReportsOverview(filters) });
  const tripsQ = useQuery({ queryKey: ["monitoring", "trips", filters], queryFn: () => fetchReportsTrips(filters) });
  const vehiclesQ = useQuery({ queryKey: ["monitoring", "vehicles", filters], queryFn: () => fetchReportsVehicles(filters) });
  const driversQ = useQuery({ queryKey: ["monitoring", "drivers", filters], queryFn: () => fetchReportsDrivers(filters) });
  const complianceQ = useQuery({ queryKey: ["monitoring", "compliance", filters], queryFn: () => fetchReportsCompliance(filters) });
  const incidentsQ = useQuery({ queryKey: ["monitoring", "incidents", filters], queryFn: () => fetchReportsIncidents(filters) });
  const expensesQ = useQuery({ queryKey: ["monitoring", "expenses", filters], queryFn: () => fetchReportsExpenses(filters) });
  const fuelQ = useQuery({ queryKey: ["monitoring", "fuel", filters], queryFn: () => fetchReportsFuel(filters) });
  const maintenanceQ = useQuery({ queryKey: ["monitoring", "maintenance", filters], queryFn: () => fetchReportsMaintenance(filters) });
  const auditSummaryQ = useQuery({ queryKey: ["monitoring", "audit-summary", filters], queryFn: () => fetchAuditSummary(filters) });
  const auditLogsQ = useQuery({ queryKey: ["monitoring", "audit-logs", filters], queryFn: () => fetchAuditLogs(filters) });
  const complianceSummaryQ = useQuery({ queryKey: ["monitoring", "driver-compliance-summary"], queryFn: fetchDriverComplianceSummary });

  const submitMutation = useMutation({
    mutationFn: () =>
      markMonitoringSubmitted({
        reporting_month: month ? `${year}-${String(month).padStart(2, "0")}` : String(year),
        prepared_by: preparedBy || undefined,
      }),
  });

  const checklistRows = useMemo(() => {
    const incidentCount = toNumber(toRecord(incidentsQ.data).total_incidents ?? toRecord(incidentsQ.data).total);
    const complianceIssues = toNumber(
      toRecord(complianceQ.data).violations_total ?? toRecord(complianceQ.data).total_violations
    );
    const deploymentTrips = toNumber(toRecord(tripsQ.data).total ?? toRecord(toRecord(tripsQ.data).totals).total);
    const maintenanceOverdue = toNumber(
      toRecord(maintenanceQ.data).overdue_count ?? toRecord(maintenanceQ.data).overdue
    );
    const debtPayments = toNumber(toRecord(expensesQ.data).total_paid ?? toRecord(toRecord(expensesQ.data).totals).paid_total);
    const months = monthNames.map((_, idx) => (month === 0 || month === idx + 1 ? "Submitted" : "Not Required"));
    return [
      [
        "Security perfection",
        "Incidents register and evidence links",
        "Security Lead",
        "Monthly",
        ...months.map((m) => (incidentCount === 0 ? m : "Not Submitted")),
        "Incident threshold: 0 critical",
      ],
      [
        "Debt service payments / DSRA",
        "Payment schedules and receipts",
        "Finance",
        "Monthly",
        ...months.map((m) => (debtPayments > 0 ? m : "Not Submitted")),
        "Finance obligations checklist",
      ],
      [
        "Reporting obligations",
        "Audit summary and monthly report package",
        "Operations",
        "Monthly",
        ...months.map((m) => (toNumber(toRecord(auditSummaryQ.data).total_logs) > 0 ? m : "Not Submitted")),
        "Submission package with logs",
      ],
      [
        "Fleet deployment",
        "Master trips table and utilization logs",
        "Fleet Ops",
        "Monthly",
        ...months.map((m) => (deploymentTrips > 0 ? m : "Not Submitted")),
        "Deployment target vs actual",
      ],
      [
        "Maintenance compliance",
        "Maintenance report + due/overdue actions",
        "Maintenance Team",
        "Monthly",
        ...months.map((m) => (maintenanceOverdue === 0 ? m : "Not Submitted")),
        "No overdue critical maintenance",
      ],
      [
        "Driver compliance",
        "Driver document summary and expiring list",
        "Compliance",
        "Monthly",
        ...months.map((m) => (complianceIssues === 0 ? m : "Not Submitted")),
        "Driver docs compliance summary",
      ],
    ];
  }, [incidentsQ.data, complianceQ.data, tripsQ.data, maintenanceQ.data, expensesQ.data, auditSummaryQ.data, month]);

  const monthlyChecklistColumns = useMemo(
    () => ["Monitoring Item", "Evidence Required", "Responsible", "Timeline", ...monthNames, "Comments / Clause Reference"],
    []
  );

  const masterTripRows = useMemo(() => {
    const rows = getRows(tripsQ.data, ["data", "trips", "items"]);
    return rows.map((row) => [
      month ? `${year}-${String(month).padStart(2, "0")}` : `${year}`,
      String(row.trip_id ?? row.id ?? "-"),
      String(row.waybill_number ?? row.reference_code ?? "-"),
      String(row.vehicle_id ?? row.truck_id ?? "-"),
      String(row.driver_name ?? row.driver ?? row.driver_id ?? "-"),
      String(row.cargo_type ?? "-"),
      String(row.origin ?? row.pickup_location ?? "-"),
      String(row.destination ?? row.dropoff_location ?? "-"),
      formatDate(row.planned_delivery ?? row.planned_delivery_at ?? row.eta),
      formatDate(row.actual_delivery ?? row.actual_delivery_at ?? row.delivered_at),
      String(row.status ?? "-"),
    ]);
  }, [tripsQ.data, month, year]);

  const fleetStatusRows = useMemo(() => {
    const rows = getRows(vehiclesQ.data, ["data", "vehicles", "items"]);
    return rows.map((row) => [
      month ? `${year}-${String(month).padStart(2, "0")}` : `${year}`,
      String(row.vehicle_id ?? row.id ?? "-"),
      String(row.license_plate ?? row.registration_number ?? "-"),
      String(row.operational_status ?? row.status ?? "Operational"),
      String(toNumber(row.trips_total ?? row.total_trips)),
      String(toNumber(row.downtime_days ?? row.downtime ?? 0)),
      toNumber(row.maintenance_total ?? row.maintenance) > 0 ? "Y" : "N",
      String(row.maintenance_type ?? "-"),
    ]);
  }, [vehiclesQ.data, month, year]);

  const driverPerfRows = useMemo(() => {
    const rows = getRows(driversQ.data, ["data", "drivers", "items"]);
    return rows.map((row) => [
      month ? `${year}-${String(month).padStart(2, "0")}` : `${year}`,
      String(row.name ?? row.driver_name ?? row.driver_id ?? "-"),
      String(toNumber(row.trips_total ?? row.total_trips)),
      String(toNumber(row.distance_km_total ?? row.distance ?? row.total_distance_km).toFixed(2)),
      String(toNumber(row.incidents_count ?? row.incident_count ?? row.incidents)),
      String(toNumber(row.score ?? row.overall_score ?? 0).toFixed(2)),
      String(row.tier ?? "-"),
      String(row.trend ?? "-"),
    ]);
  }, [driversQ.data, month, year]);

  const insuranceRows = useMemo(() => {
    return vehicles.map((vehicle) => [
      (() => {
        const row = toRecord(vehicle as unknown);
        return String(row.id ?? "-");
      })(),
      (() => {
        const row = toRecord(vehicle as unknown);
        return String(row.insurance_policy_number ?? "-");
      })(),
      (() => {
        const row = toRecord(vehicle as unknown);
        return String(row.insurance_provider ?? "-");
      })(),
      (() => {
        const row = toRecord(vehicle as unknown);
        return formatDate(row.insurance_issued_at);
      })(),
      (() => {
        const row = toRecord(vehicle as unknown);
        return formatDate(row.insurance_expires_at);
      })(),
      (() => {
        const row = toRecord(vehicle as unknown);
        return String(row.road_worthiness ?? "-");
      })(),
      (() => {
        const row = toRecord(vehicle as unknown);
        return String(row.registration_status ?? row.license_plate ?? "-");
      })(),
      (() => {
        const row = toRecord(vehicle as unknown);
        return String(row.compliance_status ?? "Unknown");
      })(),
    ]);
  }, [vehicles]);

  const incidentRows = useMemo(() => {
    const rows = getRows(incidentsQ.data, ["data", "items", "incidents"]);
    return rows.map((row) => [
      String(row.incident_number ?? row.id ?? "-"),
      formatDate(row.date ?? row.reported_at ?? row.created_at),
      String(row.trip_id ?? row.trip ?? "-"),
      String(row.vehicle_name ?? row.vehicle_id ?? "-"),
      String(row.type ?? "-"),
      String(row.severity ?? "-"),
      String(row.status ?? "-"),
      String(toNumber(row.estimated_cost ?? 0).toFixed(2)),
      String(toNumber(row.actual_cost ?? 0).toFixed(2)),
      String(row.claim_status ?? row.insurance_claim_status ?? "-"),
    ]);
  }, [incidentsQ.data]);

  const paymentRows = useMemo(() => {
    const rows = getRows(expensesQ.data, ["data", "items", "expenses", "by_trip"]);
    return rows.map((row, idx) => {
      const due = toNumber(row.amount_due ?? row.amount ?? row.total ?? row.value);
      const paid = toNumber(row.amount_paid ?? row.paid_amount ?? 0);
      return [
        month ? `${year}-${String(month).padStart(2, "0")}` : `${year}`,
        String(row.invoice_no ?? row.invoice_number ?? `INV-${idx + 1}`),
        due.toFixed(2),
        paid.toFixed(2),
        formatDate(row.paid_date ?? row.updated_at),
        (due - paid).toFixed(2),
        (paid - due).toFixed(2),
        String(row.notes ?? row.remark ?? ""),
      ];
    });
  }, [expensesQ.data, month, year]);

  const serviceKpiRows = useMemo(() => {
    const overview = toRecord(overviewQ.data);
    const trips = toRecord(overview.trips);
    const expenses = toRecord(overview.expenses);
    const fuel = toRecord(fuelQ.data);
    const maintenance = toRecord(maintenanceQ.data);
    const incident = toRecord(incidentsQ.data);
    const completion = toNumber(trips.completion_rate_pct ?? overview.completion_rate_pct);
    const fuelCost = toNumber(expenses.fuel_total ?? fuel.total_cost);
    return [
      ["Trip Completion Rate", "95", completion.toFixed(2), (completion - 95).toFixed(2), completion >= 95 ? "Green" : completion >= 85 ? "Amber" : "Red"],
      ["Incident Rate (%)", "2", toNumber(incident.incident_rate_pct ?? 0).toFixed(2), (toNumber(incident.incident_rate_pct ?? 0) - 2).toFixed(2), toNumber(incident.incident_rate_pct ?? 0) <= 2 ? "Green" : "Red"],
      ["Fuel Cost (GHS)", "0", fuelCost.toFixed(2), fuelCost.toFixed(2), fuelCost > 0 ? "Amber" : "Green"],
      ["Overdue Maintenance", "0", toNumber(maintenance.overdue_count).toFixed(2), toNumber(maintenance.overdue_count).toFixed(2), toNumber(maintenance.overdue_count) === 0 ? "Green" : "Red"],
    ];
  }, [overviewQ.data, fuelQ.data, maintenanceQ.data, incidentsQ.data]);

  const managementRows = useMemo(() => {
    const overview = toRecord(overviewQ.data);
    const tripsData = toRecord(overview.trips);
    const expenses = toRecord(overview.expenses);
    return [
      ["Total Trips", String(toNumber(tripsData.total ?? overview.total_trips)), "Combined fleet operations"],
      ["Completion Rate", `${toNumber(tripsData.completion_rate_pct ?? overview.completion_rate_pct).toFixed(2)}%`, "Service delivery effectiveness"],
      ["Total Distance", `${toNumber(tripsData.total_distance_km ?? overview.total_distance_km).toFixed(2)} km`, "Fleet utilization"],
      ["Total Expense", formatCurrency(toNumber(expenses.total ?? overview.total_expense)), "Cost performance"],
      ["Missing Evidence", String(toNumber(auditSummaryQ.data && toRecord(auditSummaryQ.data).missing_evidence_count)), "Requires remediation before submission"],
    ];
  }, [overviewQ.data, auditSummaryQ.data]);

  const budgetRevenueRows = useMemo(() => {
    const rows = getRows(tripsQ.data, ["data", "trips", "items"]);
    const byDest = new Map<string, { trips: number; amount: number }>();
    rows.forEach((row) => {
      const region = String(row.destination ?? row.dropoff_location ?? "Unknown");
      const tripsCount = 1;
      const rate = toNumber(row.rate_per_trip ?? row.trip_rate ?? 0);
      const current = byDest.get(region) ?? { trips: 0, amount: 0 };
      byDest.set(region, { trips: current.trips + tripsCount, amount: current.amount + rate * tripsCount });
    });
    return Array.from(byDest.entries()).map(([region, value]) => [region, String(value.trips), "0.00", value.amount.toFixed(2)]);
  }, [tripsQ.data]);

  const budgetMonthlyRows = useMemo(() => {
    const expenses = toRecord(toRecord(expensesQ.data).totals);
    const fuelAmount = toNumber(toRecord(expenses.by_category).fuel);
    const maintenanceAmount = toNumber(toRecord(expenses.by_category).repairs_maintenance ?? toRecord(expenses.by_category).maintenance);
    return [
      ["Regulatory / Statutory", "0.00", "Pending source mapping"],
      ["Fuel", fuelAmount.toFixed(2), "From expenses by category"],
      ["Maintenance", maintenanceAmount.toFixed(2), "From maintenance category"],
      ["Driver Cost", toNumber(toRecord(expenses.by_category).fleet_staff_costs).toFixed(2), "From expenses"],
      ["Insurance", toNumber(toRecord(expenses.by_category).insurance).toFixed(2), "From expenses"],
      ["Contingency", "0.00", "Manual allocation"],
    ];
  }, [expensesQ.data]);

  const readiness = useMemo(() => {
    const total = checklistRows.length;
    const submitted = checklistRows.filter((row) => row.slice(4, 16).some((c) => c === "Submitted")).length;
    const missing = total - submitted;
    const critical = toNumber(toRecord(incidentsQ.data).critical_incidents ?? toRecord(incidentsQ.data).critical ?? 0);
    const percent = total > 0 ? (submitted / total) * 100 : 0;
    return { percent, missing, critical };
  }, [checklistRows, incidentsQ.data]);

  const isLoading =
    overviewQ.isLoading ||
    tripsQ.isLoading ||
    vehiclesQ.isLoading ||
    driversQ.isLoading ||
    complianceQ.isLoading ||
    incidentsQ.isLoading ||
    expensesQ.isLoading ||
    fuelQ.isLoading ||
    maintenanceQ.isLoading ||
    auditSummaryQ.isLoading ||
    auditLogsQ.isLoading ||
    complianceSummaryQ.isLoading;

  const generatedAt = new Date().toISOString();
  const reportingMonthLabel = month ? `${year}-${String(month).padStart(2, "0")}` : String(year);
  const preparedByLabel = preparedBy || "System";

  const getCurrentSheet = () => {
    if (tab === "checklist") {
      return {
        name: "monthly_monitoring_checklist",
        columns: monthlyChecklistColumns,
        rows: checklistRows.map((r) => r.map((c) => String(c))),
      };
    }
    if (tab === "master_trip_operations") {
      return {
        name: "master_trip_operations_table",
        columns: ["Reporting Month", "Trip ID", "Waybill No.", "Truck ID", "Driver Name", "Cargo Type", "Origin", "Destination", "Planned Delivery", "Actual Delivery", "Status"],
        rows: masterTripRows,
      };
    }
    if (tab === "fleet_status_monthly") {
      return {
        name: "fleet_status_monthly",
        columns: ["Reporting Month", "Truck ID", "Registration Number", "Operational Status", "Total Trips Completed (Month)", "Downtime (Days)", "Maintenance Conducted (Y/N)", "Maintenance Type"],
        rows: fleetStatusRows,
      };
    }
    if (tab === "driver_performance_monthly") {
      return {
        name: "driver_performance_monthly",
        columns: ["Reporting Month", "Driver", "Trips", "Distance", "Incidents", "Score", "Tier", "Trend"],
        rows: driverPerfRows,
      };
    }
    if (tab === "insurance_compliance_tracker") {
      return {
        name: "insurance_compliance_tracker",
        columns: ["Truck ID", "Policy No", "Insurer", "Issue Date", "Expiry Date", "Road Worthiness", "Registration", "Compliance Status"],
        rows: insuranceRows,
      };
    }
    if (tab === "incident_damage_register") {
      return {
        name: "incident_damage_register",
        columns: ["Incident No", "Date", "Trip", "Vehicle", "Type", "Severity", "Status", "Estimated Cost", "Actual Cost", "Claim Status"],
        rows: incidentRows,
      };
    }
    if (tab === "fabrimetal_payment_monitoring") {
      return {
        name: "fabrimetal_payment_monitoring",
        columns: ["Month", "Invoice No", "Amount Due", "Amount Paid", "Paid Date", "Outstanding", "Variance", "Notes"],
        rows: paymentRows,
      };
    }
    if (tab === "service_kpis_monitor") {
      return {
        name: "service_kpis_monitor",
        columns: ["KPI", "Target", "Actual", "Variance", "RAG"],
        rows: serviceKpiRows,
      };
    }
    if (tab === "management_summary") {
      return {
        name: "management_summary",
        columns: ["Metric", "Value", "Highlight"],
        rows: managementRows,
      };
    }
    return {
      name: "budget_report_format",
      columns: ["Budget Item", "Number of Trips", "Rate Per Trip", "Amount (GHS)"],
      rows: budgetRevenueRows,
      extra: {
        columns: ["Budget Item", "Amount (GHS)", "Remarks"],
        rows: budgetMonthlyRows,
      },
    };
  };

  const exportCurrent = (kind: "csv" | "xlsx") => {
    const sheet = getCurrentSheet();
    const metaRows: Array<Array<string>> = [
      ["Generated At", generatedAt],
      ["Reporting Month", reportingMonthLabel],
      ["Prepared By", preparedByLabel],
      [],
    ];
    const base = [...metaRows, sheet.columns, ...sheet.rows];
    if (sheet.name === "budget_report_format") {
      base.push([], ["Monthly Budget"], (sheet as { extra: { columns: string[]; rows: string[][] } }).extra.columns, ...(sheet as { extra: { columns: string[]; rows: string[][] } }).extra.rows);
    }
    if (kind === "csv") {
      downloadCsv(`${sheet.name}-${reportingMonthLabel}.csv`, base);
      return;
    }
    downloadXlsx(`${sheet.name}-${reportingMonthLabel}.xlsx`, base);
  };

  const currentSheet = getCurrentSheet();
  const warnings = useMemo(() => {
    const items: string[] = [];
    if (readiness.missing > 0) items.push(`${readiness.missing} checklist domains are not submitted.`);
    if (readiness.critical > 0) items.push(`${readiness.critical} critical exceptions detected.`);
    if (!toNumber(toRecord(complianceSummaryQ.data).active_count ?? toRecord(complianceSummaryQ.data).active)) {
      items.push("Driver compliance evidence is missing or incomplete.");
    }
    return items;
  }, [readiness, complianceSummaryQ.data]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ops-section-title">Reports</p>
          <h2 className="text-xl font-semibold">Monitoring Workbook Alignment</h2>
          <p className="text-sm text-muted-foreground">Workbook-structured reporting tabs and exports for compliance submission.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/reports" className="rounded-lg border border-border px-3 py-2 text-sm">
            Back to Analytics Reports
          </Link>
          <button type="button" className="rounded-lg border border-border px-3 py-2 text-sm" onClick={() => exportCurrent("csv")}>
            Export CSV
          </button>
          <button type="button" className="rounded-lg border border-border px-3 py-2 text-sm" onClick={() => exportCurrent("xlsx")}>
            Export XLSX
          </button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="ops-card p-4">
          <p className="ops-section-title">Submission Readiness</p>
          <p className="mt-1 text-2xl font-bold">{readiness.percent.toFixed(1)}%</p>
        </div>
        <div className="ops-card p-4">
          <p className="ops-section-title">Missing Evidence Count</p>
          <p className="mt-1 text-2xl font-bold">{readiness.missing}</p>
        </div>
        <div className="ops-card p-4">
          <p className="ops-section-title">Critical Exceptions</p>
          <p className="mt-1 text-2xl font-bold text-rose-300">{readiness.critical}</p>
        </div>
      </section>

      <section className="ops-card p-4">
        <div className="grid gap-3 md:grid-cols-7">
          <select value={String(year)} onChange={(e) => setYear(Number(e.target.value))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            {Array.from({ length: 5 }).map((_, idx) => {
              const y = now.getFullYear() - 2 + idx;
              return (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              );
            })}
          </select>
          <select value={String(month)} onChange={(e) => setMonth(Number(e.target.value))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option value="0">All Months</option>
            {monthNames.map((m, idx) => (
              <option key={m} value={String(idx + 1)}>
                {m}
              </option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option value="">All Status</option>
            <option value="submitted">Submitted</option>
            <option value="not_submitted">Not Submitted</option>
            <option value="n_a">N/A</option>
            <option value="not_required">Not Required</option>
          </select>
          <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option value="">All Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option value="">All Vehicles</option>
            {vehicles.map((v) => (
              <option key={v.id} value={String(v.id)}>
                {v.name} ({v.id})
              </option>
            ))}
          </select>
          <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option value="">All Drivers</option>
            {users.map((u) => (
              <option key={u.id} value={String(u.id)}>
                {String(u.name ?? u.email ?? `User ${u.id}`)}
              </option>
            ))}
          </select>
          <input value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} placeholder="Prepared By" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        {workbookTabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={[
              "rounded-md border px-3 py-1.5 text-sm font-semibold transition",
              tab === item.key
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {item.label}
          </button>
        ))}
      </section>

      {warnings.length ? (
        <section className="ops-card p-4">
          <p className="mb-2 text-sm font-semibold text-amber-300">Validation Warnings</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {warnings.map((item, idx) => (
              <li key={idx}>- {item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="ops-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Generated At: <span className="text-foreground">{generatedAt}</span> · Reporting Month:{" "}
            <span className="text-foreground">{reportingMonthLabel}</span> · Prepared By:{" "}
            <span className="text-foreground">{preparedByLabel}</span>
          </p>
          <button
            type="button"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {submitMutation.isPending ? "Submitting..." : "Mark as Submitted"}
          </button>
        </div>
      </section>

      {isLoading ? (
        <div className="ops-card p-4 text-sm text-muted-foreground">Loading report data...</div>
      ) : (
        <>
          <Table columns={currentSheet.columns} rows={currentSheet.rows} />
          {tab === "budget" ? (
            <Table
              columns={["Budget Item", "Amount (GHS)", "Remarks"]}
              rows={budgetMonthlyRows}
            />
          ) : null}
        </>
      )}

      {submitMutation.isError ? (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
          Unable to write submission audit entry on available endpoints.
        </div>
      ) : null}
      {submitMutation.isSuccess ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          Submission marked and audit entry attempted.
        </div>
      ) : null}
    </div>
  );
}
