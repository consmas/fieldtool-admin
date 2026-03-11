"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import {
  fetchBudgetWorkbook,
  fetchMonitoringRegime,
  fetchMonitoringWorkbook,
  syncWorkbookData,
} from "@/lib/api/reports";
import { useAuthStore } from "@/stores/auth.store";

type WorkbookTabKey =
  | "checklist"
  | "master_trip_operations"
  | "fleet_status"
  | "driver_performance"
  | "insurance_compliance"
  | "incident_damage_register"
  | "fabrimetal_payment_monitoring"
  | "service_kpis_monitor"
  | "management_summary"
  | "budget";

const workbookTabs: Array<{ key: WorkbookTabKey; label: string }> = [
  { key: "checklist", label: "Monthly Monitoring Checklist" },
  { key: "master_trip_operations", label: "Master Trip Operations Table" },
  { key: "fleet_status", label: "Fleet Status (Monthly)" },
  { key: "driver_performance", label: "Driver Performance (Monthly)" },
  { key: "insurance_compliance", label: "Insurance & Compliance Tracker" },
  { key: "incident_damage_register", label: "Incident & Damage Register" },
  { key: "fabrimetal_payment_monitoring", label: "Fabrimetal Payment Monitoring" },
  { key: "service_kpis_monitor", label: "Service KPIs Monitor" },
  { key: "management_summary", label: "Management Summary" },
  { key: "budget", label: "Budget Workbook" },
];

function toRecord(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  return v as Record<string, unknown>;
}

type TableRow = Record<string, unknown> | unknown[];

function toRows(input: unknown): TableRow[] {
  if (Array.isArray(input)) return input as TableRow[];
  const payload = toRecord(input);
  if (Array.isArray(payload.rows)) return payload.rows as TableRow[];
  if (Array.isArray(payload.items)) return payload.items as TableRow[];
  if (Array.isArray(payload.data)) return payload.data as TableRow[];
  return [];
}

function toColumns(input: unknown, rows: TableRow[]): string[] {
  const payload = toRecord(input);
  if (Array.isArray(payload.tab_headers)) return payload.tab_headers.map((col) => String(col));
  if (Array.isArray(payload.headers)) return payload.headers.map((col) => String(col));
  if (Array.isArray(payload.columns)) return payload.columns.map((col) => String(col));
  if (rows.length > 0 && !Array.isArray(rows[0])) return Object.keys(rows[0]);
  return [];
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function LoadingSkeletonTable() {
  return (
    <section className="ops-card overflow-hidden p-4">
      <div className="space-y-2">
        {Array.from({ length: 7 }).map((_, idx) => (
          <div key={idx} className="h-9 animate-pulse rounded-md bg-muted/50" />
        ))}
      </div>
    </section>
  );
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
      <div>{message}</div>
      <button type="button" onClick={onRetry} className="mt-2 rounded-md border border-rose-400/40 px-2 py-1 text-xs">
        Retry
      </button>
    </div>
  );
}

function openExportLink(url?: string) {
  if (!url) return false;
  if (!isAbsoluteUrl(url)) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

function DataTable({ columns, rows }: { columns: string[]; rows: TableRow[] }) {
  if (!rows.length) {
    return <div className="ops-card p-4 text-sm text-muted-foreground">No records for this month.</div>;
  }

  return (
    <section className="ops-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/60 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-3 py-2.5">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-t border-border/80">
                {columns.map((column, colIdx) => {
                  const rawValue = Array.isArray(row) ? row[colIdx] : row[column];
                  const value = formatCell(rawValue);
                  return (
                    <td key={`${idx}-${column}`} className="px-3 py-2.5 text-muted-foreground">
                      {isAbsoluteUrl(value) ? (
                        <a href={value} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          {value}
                        </a>
                      ) : (
                        value
                      )}
                    </td>
                  );
                })}
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
  const [month, setMonth] = useState(now.toISOString().slice(0, 7));
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncSummary, setSyncSummary] = useState<Record<string, unknown> | null>(null);
  const userRole = useAuthStore((state) => state.user?.role ?? "");
  const canSyncWorkbook = userRole === "admin" || userRole === "finance";

  const workbookQ = useQuery({
    queryKey: ["reports", "monitoring_workbook", month],
    queryFn: () => fetchMonitoringWorkbook(month),
    enabled: /^\d{4}-\d{2}$/.test(month),
  });

  const regimeQ = useQuery({
    queryKey: ["reports", "monitoring_regime", month],
    queryFn: () => fetchMonitoringRegime(month),
    enabled: /^\d{4}-\d{2}$/.test(month),
  });

  const budgetQ = useQuery({
    queryKey: ["reports", "budget_workbook", month],
    queryFn: () => fetchBudgetWorkbook(month),
    enabled: /^\d{4}-\d{2}$/.test(month),
  });

  const workbook = toRecord(workbookQ.data);
  const regime = toRecord(regimeQ.data);
  const budget = toRecord(budgetQ.data);

  const tabsRecord = toRecord(workbook.tabs);
  const tabHeaders = toRecord(workbook.tab_headers);
  const workbookExportLinks = toRecord(workbook.export_links);
  const regimeExportLinks = toRecord(regime.export_links);
  const budgetExportLinks = toRecord(budget.export_links);

  const submissionReadiness = Number(workbook.submission_readiness_pct ?? 0) || 0;
  const missingEvidence = Number(workbook.missing_evidence_count ?? 0) || 0;
  const criticalExceptions = Number(workbook.critical_exceptions ?? 0) || 0;
  const warnings = Array.isArray(workbook.validation_warnings) ? workbook.validation_warnings.map((w) => String(w)) : [];
  const generatedAt = String(workbook.generated_at ?? regime.generated_at ?? "-");
  const reportingMonth = String(workbook.reporting_month ?? regime.reporting_month ?? month);
  const preparedBy = String(workbook.prepared_by ?? regime.prepared_by ?? "System");

  const sheet = useMemo<{
    columns: string[];
    rows: TableRow[];
    revenueColumns: string[];
    revenueRows: TableRow[];
    monthlyColumns: string[];
    monthlyRows: TableRow[];
  }>(() => {
    if (tab === "checklist") {
      const regimeBody = regime.reporting ?? regime.tabs ?? regime.data ?? regime;
      const rows = toRows(regimeBody);
      const columns = toColumns({ tab_headers: regime.tab_headers, rows }, rows);
      return { columns, rows, revenueColumns: [], revenueRows: [], monthlyColumns: [], monthlyRows: [] };
    }

    if (tab === "budget") {
      const revenueRows = toRows(budget.revenue_breakdown_rows);
      const monthlyRows = toRows(budget.monthly_budget_rows);
      const revenueColumns = toColumns({ tab_headers: budget.revenue_breakdown_headers, rows: revenueRows }, revenueRows);
      const monthlyColumns = toColumns({ tab_headers: budget.monthly_budget_headers, rows: monthlyRows }, monthlyRows);
      return { columns: [], rows: [], revenueRows, monthlyRows, revenueColumns, monthlyColumns };
    }

    const keyMap: Record<Exclude<WorkbookTabKey, "checklist" | "budget">, string> = {
      master_trip_operations: "master_trip_operations",
      fleet_status: "fleet_status",
      driver_performance: "driver_performance",
      insurance_compliance: "insurance_compliance",
      incident_damage_register: "incident_damage_register",
      fabrimetal_payment_monitoring: "fabrimetal_payment_monitoring",
      service_kpis_monitor: "service_kpis_monitor",
      management_summary: "management_summary",
    };

    const tabKey = keyMap[tab as Exclude<WorkbookTabKey, "checklist" | "budget">];
    const source = tabsRecord[tabKey];
    const rows = toRows(source);
    const columns = toColumns({ tab_headers: tabHeaders[tabKey], rows }, rows);
    return { columns, rows, revenueColumns: [], revenueRows: [], monthlyColumns: [], monthlyRows: [] };
  }, [tab, regime, budget, tabsRecord, tabHeaders]);

  const tabState = useMemo(() => {
    if (tab === "checklist") {
      return {
        loading: regimeQ.isLoading || regimeQ.isFetching,
        error: regimeQ.isError,
        retry: () => regimeQ.refetch(),
      };
    }
    if (tab === "budget") {
      return {
        loading: budgetQ.isLoading || budgetQ.isFetching,
        error: budgetQ.isError,
        retry: () => budgetQ.refetch(),
      };
    }
    return {
      loading: workbookQ.isLoading || workbookQ.isFetching,
      error: workbookQ.isError,
      retry: () => workbookQ.refetch(),
    };
  }, [tab, workbookQ, regimeQ, budgetQ]);

  const onExportClick = (url: string | undefined, label: string) => {
    if (!openExportLink(url)) {
      setMessage(`Missing export link for ${label}.`);
      return;
    }
    setMessage(`${label} export opened in a new tab.`);
  };

  const onSyncWorkbook = async () => {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      setToast({ kind: "error", text: "Month must be in YYYY-MM format." });
      return;
    }
    setSyncing(true);
    try {
      const summary = await syncWorkbookData(month);
      setSyncSummary(summary);
      setToast({ kind: "success", text: "Workbook sync completed" });
      await Promise.all([workbookQ.refetch(), budgetQ.refetch(), regimeQ.refetch()]);
    } catch (error) {
      const maybeError = error as AxiosError<{ message?: string; error?: string; detail?: string }>;
      const detail =
        maybeError.response?.data?.detail ??
        maybeError.response?.data?.message ??
        maybeError.response?.data?.error ??
        "Unable to sync workbook data.";
      setToast({ kind: "error", text: detail });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ops-section-title">Reports</p>
          <h2 className="text-xl font-semibold">Monitoring Workbook (Backend Source)</h2>
          <p className="text-sm text-muted-foreground">All workbook cards/tabs are rendered directly from backend payloads.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/reports" className="rounded-lg border border-border px-3 py-2 text-sm">
            Back to Analytics Reports
          </Link>
          {canSyncWorkbook ? (
            <button
              type="button"
              onClick={onSyncWorkbook}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {syncing ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-primary" /> : null}
              {syncing ? "Syncing..." : "Sync Workbook Data"}
            </button>
          ) : null}
          <button
            type="button"
            className="rounded-lg border border-border px-3 py-2 text-sm"
            onClick={() => onExportClick(String(workbookExportLinks.csv ?? ""), "Workbook CSV")}
            disabled={!workbookExportLinks.csv}
          >
            Workbook CSV
          </button>
          <button
            type="button"
            className="rounded-lg border border-border px-3 py-2 text-sm"
            onClick={() => onExportClick(String(workbookExportLinks.xlsx ?? ""), "Workbook XLSX")}
            disabled={!workbookExportLinks.xlsx}
          >
            Workbook XLSX
          </button>
          <button
            type="button"
            className="rounded-lg border border-border px-3 py-2 text-sm"
            onClick={() => onExportClick(String(regimeExportLinks.xlsx ?? ""), "Regime XLSX")}
            disabled={!regimeExportLinks.xlsx}
          >
            Regime XLSX
          </button>
          <button
            type="button"
            className="rounded-lg border border-border px-3 py-2 text-sm"
            onClick={() => onExportClick(String(budgetExportLinks.xlsx ?? ""), "Budget XLSX")}
            disabled={!budgetExportLinks.xlsx}
          >
            Budget XLSX
          </button>
        </div>
      </div>

      <section className="ops-card p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
        </div>
      </section>

      {message ? <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">{message}</div> : null}
      {toast ? (
        <div
          className={[
            "rounded-lg border px-3 py-2 text-sm",
            toast.kind === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-rose-500/30 bg-rose-500/10 text-rose-300",
          ].join(" ")}
        >
          {toast.text}
        </div>
      ) : null}
      {syncSummary ? (
        <section className="ops-card p-4">
          <p className="mb-2 text-sm font-semibold">Sync Summary</p>
          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
            <div>Trips Updated: <span className="text-foreground">{Number(syncSummary.trips_updated ?? 0)}</span></div>
            <div>Road Expenses Synced: <span className="text-foreground">{Number(syncSummary.road_expenses_synced ?? 0)}</span></div>
            <div>Fuel Logs Created: <span className="text-foreground">{Number(syncSummary.fuel_logs_created ?? 0)}</span></div>
            <div>Driver Profiles Created: <span className="text-foreground">{Number(syncSummary.driver_profiles_created ?? 0)}</span></div>
            <div>Driver Scores Created: <span className="text-foreground">{Number(syncSummary.driver_scores_created ?? 0)}</span></div>
            <div>Errors: <span className="text-foreground">{Array.isArray(syncSummary.errors) ? syncSummary.errors.length : 0}</span></div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="ops-card p-4">
          <p className="ops-section-title">Submission Readiness</p>
          <p className="mt-1 text-2xl font-bold">{submissionReadiness.toFixed(1)}%</p>
        </div>
        <div className="ops-card p-4">
          <p className="ops-section-title">Missing Evidence Count</p>
          <p className="mt-1 text-2xl font-bold">{missingEvidence}</p>
        </div>
        <div className="ops-card p-4">
          <p className="ops-section-title">Critical Exceptions</p>
          <p className="mt-1 text-2xl font-bold text-rose-300">{criticalExceptions}</p>
        </div>
      </section>

      {warnings.length > 0 ? (
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
        <p className="text-sm text-muted-foreground">
          Generated At: <span className="text-foreground">{generatedAt}</span> · Reporting Month: <span className="text-foreground">{reportingMonth}</span> · Prepared By: <span className="text-foreground">{preparedBy}</span>
        </p>
      </section>

      <section className="flex flex-wrap gap-2">
        {workbookTabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={[
              "rounded-md border px-3 py-1.5 text-sm font-semibold transition",
              tab === item.key ? "border-primary/40 bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {item.label}
          </button>
        ))}
      </section>

      {tabState.loading ? <LoadingSkeletonTable /> : null}
      {!tabState.loading && tabState.error ? <InlineError message="Unable to load data for this tab." onRetry={tabState.retry} /> : null}
      {!tabState.loading && !tabState.error && tab !== "budget" ? (
        <DataTable columns={sheet.columns ?? []} rows={sheet.rows ?? []} />
      ) : null}
      {!tabState.loading && !tabState.error && tab === "budget" ? (
        <div className="space-y-4">
          <section>
            <p className="mb-2 text-sm font-semibold">Revenue Breakdown</p>
            <DataTable columns={sheet.revenueColumns ?? []} rows={sheet.revenueRows ?? []} />
          </section>
          <section>
            <p className="mb-2 text-sm font-semibold">Monthly Budget</p>
            <DataTable columns={sheet.monthlyColumns ?? []} rows={sheet.monthlyRows ?? []} />
          </section>
        </div>
      ) : null}
    </div>
  );
}
