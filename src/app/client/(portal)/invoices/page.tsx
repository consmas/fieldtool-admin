"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchClientBillingSummary,
  fetchClientInvoiceDetail,
  fetchClientInvoices,
} from "@/lib/api/client-portal";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export default function ClientInvoicesPage() {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | number | null>(null);
  const invoicesQuery = useQuery({
    queryKey: ["client", "invoices"],
    queryFn: () => fetchClientInvoices(),
  });
  const summaryQuery = useQuery({
    queryKey: ["client", "billing-summary"],
    queryFn: fetchClientBillingSummary,
  });
  const detailQuery = useQuery({
    queryKey: ["client", "invoice-detail", selectedInvoiceId],
    queryFn: () => fetchClientInvoiceDetail(selectedInvoiceId as string | number),
    enabled: selectedInvoiceId !== null,
  });

  const invoices = useMemo(() => invoicesQuery.data?.items ?? [], [invoicesQuery.data?.items]);
  const summary = useMemo(() => asRecord(summaryQuery.data), [summaryQuery.data]);
  const detail = useMemo(() => asRecord(detailQuery.data), [detailQuery.data]);

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <article className="ops-card p-4">
          <p className="ops-section-title">Outstanding</p>
          <p className="mt-2 text-xl font-semibold">{formatCurrency(asNumber(summary.outstanding_balance))}</p>
        </article>
        <article className="ops-card p-4">
          <p className="ops-section-title">Paid</p>
          <p className="mt-2 text-xl font-semibold">{formatCurrency(asNumber(summary.paid_total))}</p>
        </article>
        <article className="ops-card p-4">
          <p className="ops-section-title">Overdue</p>
          <p className="mt-2 text-xl font-semibold">{formatCurrency(asNumber(summary.overdue_total))}</p>
        </article>
      </section>

      <section className="ops-card overflow-hidden">
        {invoicesQuery.isLoading ? <div className="p-6 text-sm text-muted-foreground">Loading invoices...</div> : null}
        {invoicesQuery.isError ? <div className="p-6 text-sm text-rose-300">Unable to load invoices.</div> : null}
        {!invoicesQuery.isLoading && !invoicesQuery.isError && invoices.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No invoices found.</div>
        ) : null}
        {invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Invoice #</th>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Due Date</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Amount</th>
                  <th className="px-3 py-2 text-left" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((row, index) => {
                  const id = (row.id ?? row.invoice_id ?? index) as string | number;
                  return (
                    <tr key={String(id)}>
                      <td className="px-3 py-2 font-semibold">{String(row.invoice_number ?? row.reference ?? "-")}</td>
                      <td className="px-3 py-2 text-muted-foreground">{String(row.invoice_date ?? row.date ?? "-")}</td>
                      <td className="px-3 py-2 text-muted-foreground">{String(row.due_date ?? "-")}</td>
                      <td className="px-3 py-2 text-muted-foreground">{String(row.status ?? "-")}</td>
                      <td className="px-3 py-2 text-muted-foreground">{formatCurrency(asNumber(row.total_amount ?? row.amount))}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-foreground"
                          onClick={() => setSelectedInvoiceId(id)}
                        >
                          View
                        </button>
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
        <h3 className="text-sm font-semibold text-foreground">Invoice Detail</h3>
        {!selectedInvoiceId ? <p className="mt-2 text-sm text-muted-foreground">Select an invoice to view details.</p> : null}
        {detailQuery.isLoading ? <p className="mt-2 text-sm text-muted-foreground">Loading invoice detail...</p> : null}
        {detailQuery.isError ? <p className="mt-2 text-sm text-rose-300">Unable to load selected invoice.</p> : null}
        {!detailQuery.isLoading && !detailQuery.isError && selectedInvoiceId ? (
          <div className="mt-2 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
            <p>Invoice #: <span className="text-muted-foreground">{String(detail.invoice_number ?? "-")}</span></p>
            <p>Status: <span className="text-muted-foreground">{String(detail.status ?? "-")}</span></p>
            <p>Invoice Date: <span className="text-muted-foreground">{String(detail.invoice_date ?? "-")}</span></p>
            <p>Due Date: <span className="text-muted-foreground">{String(detail.due_date ?? "-")}</span></p>
            <p>Total: <span className="text-muted-foreground">{formatCurrency(asNumber(detail.total_amount ?? detail.amount))}</span></p>
            <p>Balance: <span className="text-muted-foreground">{formatCurrency(asNumber(detail.balance_due ?? detail.balance))}</span></p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
