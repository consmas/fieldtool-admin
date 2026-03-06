"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { reconcileFuelDeposits, type OmcName } from "@/lib/api/fuel_analytics";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asList(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value as Record<string, unknown>[];
  const payload = asRecord(value);
  if (Array.isArray(payload.data)) return payload.data as Record<string, unknown>[];
  if (Array.isArray(payload.items)) return payload.items as Record<string, unknown>[];
  if (Array.isArray(payload.rows)) return payload.rows as Record<string, unknown>[];
  return [];
}

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 2 }).format(toNumber(value));
}

export default function FuelDepositReconciliationPage() {
  const [omcName, setOmcName] = useState<OmcName>("westport");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState<string>("");

  const reconcileMutation = useMutation({
    mutationFn: ({ dryRun }: { dryRun: boolean }) =>
      reconcileFuelDeposits({
        omc_name: omcName,
        month,
        dry_run: dryRun,
        target_statuses: ["approved", "paid"],
      }),
    onSuccess: (data, vars) => {
      setResult(data);
      setMessage(vars.dryRun ? "Preview generated." : "Reconciliation applied.");
    },
    onError: () => setMessage("Unable to process reconciliation request."),
  });

  const normalized = useMemo(() => {
    const payload = asRecord(result);
    const data = asRecord(payload.data ?? payload.result ?? payload.summary);
    const matchedFuelExpenses =
      asList(payload.matched_fuel_expenses).length > 0
        ? asList(payload.matched_fuel_expenses)
        : asList(data.matched_fuel_expenses);
    const skippedRows =
      asList(payload.skipped_unmatched_rows).length > 0
        ? asList(payload.skipped_unmatched_rows)
        : asList(data.skipped_unmatched_rows);
    return {
      matchedFuelExpenses,
      skippedRows,
      totalToDeduct:
        payload.total_to_deduct ??
        data.total_to_deduct ??
        payload.total_deduct ??
        data.total_deduct ??
        0,
      openingBalance:
        payload.opening_balance ?? data.opening_balance ?? payload.balance_before ?? data.balance_before ?? 0,
      closingBalance:
        payload.closing_balance ?? data.closing_balance ?? payload.balance_after ?? data.balance_after ?? 0,
    };
  }, [result]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Fuel</p>
        <h2 className="text-lg font-semibold md:text-xl">Fuel Deposit Reconciliation</h2>
        <p className="text-sm text-muted-foreground">Preview or apply monthly OMC deduction reconciliation.</p>
      </div>

      <section className="ops-card p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <select value={omcName} onChange={(e) => setOmcName(e.target.value as OmcName)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option value="westport">Westport</option>
            <option value="top_oil">Top Oil</option>
            <option value="other">Other</option>
          </select>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <button
            type="button"
            onClick={() => {
              if (!omcName) {
                setMessage("OMC is required.");
                return;
              }
              if (!/^\d{4}-\d{2}$/.test(month)) {
                setMessage("Month must be in YYYY-MM format.");
                return;
              }
              reconcileMutation.mutate({ dryRun: true });
            }}
            disabled={reconcileMutation.isPending || !month}
            className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground disabled:opacity-60"
          >
            {reconcileMutation.isPending ? "Processing..." : "Preview"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!omcName) {
                setMessage("OMC is required.");
                return;
              }
              if (!/^\d{4}-\d{2}$/.test(month)) {
                setMessage("Month must be in YYYY-MM format.");
                return;
              }
              reconcileMutation.mutate({ dryRun: false });
            }}
            disabled={reconcileMutation.isPending || !month}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {reconcileMutation.isPending ? "Processing..." : "Apply"}
          </button>
        </div>
        {message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="ops-card p-4">
          <p className="ops-section-title">Matched Fuel Expenses</p>
          <p className="mt-2 text-2xl font-bold">{normalized.matchedFuelExpenses.length}</p>
        </article>
        <article className="ops-card p-4">
          <p className="ops-section-title">Total To Deduct</p>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(normalized.totalToDeduct)}</p>
        </article>
        <article className="ops-card p-4">
          <p className="ops-section-title">Opening Balance</p>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(normalized.openingBalance)}</p>
        </article>
        <article className="ops-card p-4">
          <p className="ops-section-title">Closing Balance</p>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(normalized.closingBalance)}</p>
        </article>
      </section>

      <section className="ops-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Matched Fuel Expenses</h3>
        {normalized.matchedFuelExpenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matched fuel expenses.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="py-2">Expense ID</th>
                  <th className="py-2">Trip</th>
                  <th className="py-2">Vehicle</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {normalized.matchedFuelExpenses.map((row, idx) => (
                  <tr key={String(row.id ?? idx)} className="border-t border-border">
                    <td className="py-2 text-muted-foreground">{String(row.id ?? row.expense_id ?? "-")}</td>
                    <td className="py-2 text-muted-foreground">{String(row.trip_id ?? "-")}</td>
                    <td className="py-2 text-muted-foreground">{String(row.vehicle_id ?? "-")}</td>
                    <td className="py-2 text-muted-foreground">{formatCurrency(row.amount ?? row.total ?? 0)}</td>
                    <td className="py-2 text-muted-foreground">{String(row.status ?? "-")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="ops-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Skipped / Unmatched Rows</h3>
        {normalized.skippedRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No skipped rows.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="py-2">Reference</th>
                  <th className="py-2">Reason</th>
                  <th className="py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {normalized.skippedRows.map((row, idx) => (
                  <tr key={String(row.id ?? idx)} className="border-t border-border">
                    <td className="py-2 text-muted-foreground">{String(row.reference ?? row.id ?? "-")}</td>
                    <td className="py-2 text-muted-foreground">{String(row.reason ?? row.message ?? "-")}</td>
                    <td className="py-2 text-muted-foreground">{formatCurrency(row.amount ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
