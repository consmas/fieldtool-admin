"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAuditTrail } from "@/lib/api/driver_intelligence";

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

export default function AuditTrailPage() {
  const [filters, setFilters] = useState({
    actor: "",
    entity_type: "",
    action_type: "",
    date_from: "",
    date_to: "",
  });

  const auditQuery = useQuery({
    queryKey: ["audit-trail", filters],
    queryFn: () =>
      fetchAuditTrail({
        actor: filters.actor || undefined,
        entity_type: filters.entity_type || undefined,
        action_type: filters.action_type || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
      }),
  });

  const items = useMemo(() => auditQuery.data?.items ?? [], [auditQuery.data?.items]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ops-section-title">Audit Trail</p>
          <h2 className="text-lg font-semibold md:text-xl">Action History</h2>
          <p className="text-sm text-muted-foreground">Immutable timeline across drivers, documents, insurance, tier updates and scoring changes.</p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-2 text-sm"
          onClick={() =>
            downloadCsv(
              "audit-trail.csv",
              [
                ["timestamp", "actor", "entity_type", "entity_id", "action_type", "before", "after", "notes", "source"],
                ...items.map((item) => {
                  const row = item as Record<string, unknown>;
                  return [
                    row.timestamp ?? row.created_at,
                    row.actor ?? row.user_name ?? row.user_id,
                    row.entity_type,
                    row.entity_id,
                    row.action_type ?? row.action,
                    JSON.stringify(row.before ?? row.before_snapshot ?? {}),
                    JSON.stringify(row.after ?? row.after_snapshot ?? {}),
                    row.notes ?? row.reason,
                    row.source,
                  ];
                }),
              ]
            )
          }
        >
          Export CSV
        </button>
      </div>

      <section className="ops-card p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <input value={filters.actor} onChange={(e) => setFilters((p) => ({ ...p, actor: e.target.value }))} placeholder="Actor" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <input value={filters.entity_type} onChange={(e) => setFilters((p) => ({ ...p, entity_type: e.target.value }))} placeholder="Entity type" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <input value={filters.action_type} onChange={(e) => setFilters((p) => ({ ...p, action_type: e.target.value }))} placeholder="Action type" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <input type="date" value={filters.date_from} onChange={(e) => setFilters((p) => ({ ...p, date_from: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <input type="date" value={filters.date_to} onChange={(e) => setFilters((p) => ({ ...p, date_to: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
        </div>
      </section>

      <section className="ops-card p-4">
        {auditQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading audit trail...</p> : null}
        {auditQuery.isError ? <p className="text-sm text-rose-300">Unable to load audit trail. Confirm backend endpoint availability.</p> : null}
        {!auditQuery.isLoading && !auditQuery.isError && items.length === 0 ? <p className="text-sm text-muted-foreground">No audit records.</p> : null}
        {items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1400px] text-sm">
              <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="py-2">Timestamp</th>
                  <th className="py-2">Actor</th>
                  <th className="py-2">Entity Type</th>
                  <th className="py-2">Entity ID</th>
                  <th className="py-2">Action</th>
                  <th className="py-2">Before</th>
                  <th className="py-2">After</th>
                  <th className="py-2">Notes</th>
                  <th className="py-2">Source</th>
                  <th className="py-2">Open</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const row = item as Record<string, unknown>;
                  const entityType = String(row.entity_type ?? "");
                  const entityId = String(row.entity_id ?? "");
                  const href =
                    entityType.toLowerCase().includes("driver")
                      ? `/driver-intelligence/${entityId}`
                      : entityType.toLowerCase().includes("vehicle")
                      ? `/vehicles/${entityId}`
                      : entityType.toLowerCase().includes("document")
                      ? "/compliance"
                      : null;
                  return (
                    <tr key={idx} className="border-t border-border align-top">
                      <td className="py-2 text-muted-foreground">{String(row.timestamp ?? row.created_at ?? "-")}</td>
                      <td className="py-2 text-muted-foreground">{String(row.actor ?? row.user_name ?? row.user_id ?? "system")}</td>
                      <td className="py-2 text-muted-foreground">{entityType || "-"}</td>
                      <td className="py-2 text-muted-foreground">{entityId || "-"}</td>
                      <td className="py-2 text-muted-foreground">{String(row.action_type ?? row.action ?? "-")}</td>
                      <td className="py-2 text-muted-foreground"><pre className="max-w-[220px] overflow-x-auto whitespace-pre-wrap text-xs">{JSON.stringify(row.before ?? row.before_snapshot ?? {}, null, 2)}</pre></td>
                      <td className="py-2 text-muted-foreground"><pre className="max-w-[220px] overflow-x-auto whitespace-pre-wrap text-xs">{JSON.stringify(row.after ?? row.after_snapshot ?? {}, null, 2)}</pre></td>
                      <td className="py-2 text-muted-foreground">{String(row.notes ?? row.reason ?? "-")}</td>
                      <td className="py-2 text-muted-foreground">{String(row.source ?? "-")}</td>
                      <td className="py-2">
                        {href ? (
                          <Link href={href} className="rounded border border-border px-2 py-1 text-xs">
                            Open
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
