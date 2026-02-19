"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchClientShipments } from "@/lib/api/client-portal";

type Filters = {
  status: string;
  date_from: string;
  date_to: string;
  q: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export default function ClientShipmentsPage() {
  const [filters, setFilters] = useState<Filters>({
    status: "",
    date_from: "",
    date_to: "",
    q: "",
  });

  const shipmentsQuery = useQuery({
    queryKey: ["client", "shipments", filters],
    queryFn: () => fetchClientShipments(filters),
  });

  const items = useMemo(() => shipmentsQuery.data?.items ?? [], [shipmentsQuery.data?.items]);
  const pagination = useMemo(() => asRecord(shipmentsQuery.data?.raw.pagination), [shipmentsQuery.data?.raw.pagination]);

  return (
    <div className="space-y-4">
      <section className="ops-card p-4">
        <h2 className="text-base font-semibold text-foreground">Shipments</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4">
          <input
            value={filters.q}
            onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
            placeholder="Search by tracking number"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="">All status</option>
            <option value="pending">Pending</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
          </select>
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => setFilters((prev) => ({ ...prev, date_from: e.target.value }))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => setFilters((prev) => ({ ...prev, date_to: e.target.value }))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
        </div>
      </section>

      <section className="ops-card overflow-hidden">
        {shipmentsQuery.isLoading ? <div className="p-6 text-sm text-muted-foreground">Loading shipments...</div> : null}
        {shipmentsQuery.isError ? <div className="p-6 text-sm text-rose-300">Unable to load shipments.</div> : null}
        {!shipmentsQuery.isLoading && !shipmentsQuery.isError && items.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No shipments found.</div>
        ) : null}
        {items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Tracking #</th>
                  <th className="px-3 py-2 text-left">Origin</th>
                  <th className="px-3 py-2 text-left">Destination</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">ETA</th>
                  <th className="px-3 py-2 text-left" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((row, index) => {
                  const tracking = String(row.tracking_number ?? row.reference ?? "");
                  return (
                    <tr key={`${tracking}-${index}`}>
                      <td className="px-3 py-2 font-semibold text-foreground">{tracking || "-"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{String(row.origin ?? "-")}</td>
                      <td className="px-3 py-2 text-muted-foreground">{String(row.destination ?? "-")}</td>
                      <td className="px-3 py-2 text-muted-foreground">{String(row.status ?? "-")}</td>
                      <td className="px-3 py-2 text-muted-foreground">{String(row.eta ?? row.expected_delivery ?? "-")}</td>
                      <td className="px-3 py-2">
                        {tracking ? (
                          <Link
                            href={`/client/shipments/${tracking}`}
                            className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-foreground"
                          >
                            View
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <p className="text-xs text-muted-foreground">
        Page {String(pagination.page ?? 1)} of {String(pagination.total_pages ?? 1)}
      </p>
    </div>
  );
}
