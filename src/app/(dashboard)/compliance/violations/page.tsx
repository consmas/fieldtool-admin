"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createViolationWaiver,
  fetchComplianceViolation,
  fetchComplianceViolations,
  updateComplianceViolation,
} from "@/lib/api/compliance_incidents";

type Filters = {
  status: string;
  severity: string;
  requirement: string;
  violatable_type: string;
  date_from: string;
  date_to: string;
};

export default function ComplianceViolationsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<Filters>({
    status: "",
    severity: "",
    requirement: "",
    violatable_type: "",
    date_from: "",
    date_to: "",
  });
  const [selectedViolationId, setSelectedViolationId] = useState<string | number | null>(null);
  const [waiverForm, setWaiverForm] = useState({
    reason: "",
    conditions: "",
    risk_assessment: "",
    effective_from: "",
    effective_to: "",
  });

  const violationsQuery = useQuery({
    queryKey: ["compliance", "violations", filters],
    queryFn: () => fetchComplianceViolations(filters),
  });

  const detailQuery = useQuery({
    queryKey: ["compliance", "violation-detail", selectedViolationId],
    queryFn: () => fetchComplianceViolation(selectedViolationId as string | number),
    enabled: selectedViolationId !== null,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: Record<string, unknown> }) =>
      updateComplianceViolation(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["compliance", "violations"] });
      await queryClient.invalidateQueries({ queryKey: ["compliance", "violation-detail"] });
    },
  });

  const waiverMutation = useMutation({
    mutationFn: ({ id }: { id: string | number }) =>
      createViolationWaiver(id, waiverForm),
    onSuccess: async () => {
      setWaiverForm({
        reason: "",
        conditions: "",
        risk_assessment: "",
        effective_from: "",
        effective_to: "",
      });
      await queryClient.invalidateQueries({ queryKey: ["compliance", "violations"] });
      await queryClient.invalidateQueries({ queryKey: ["compliance", "violation-detail"] });
    },
  });

  const rows = useMemo(() => violationsQuery.data ?? [], [violationsQuery.data]);
  const detail = useMemo(() => (detailQuery.data ?? {}) as Record<string, unknown>, [detailQuery.data]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ops-section-title">Compliance</p>
          <h2 className="text-lg font-semibold md:text-xl">Violations Center</h2>
        </div>
        <Link href="/compliance" className="rounded-lg border border-border px-3 py-2 text-sm">Back to Compliance</Link>
      </div>

      <section className="ops-card p-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <input value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} placeholder="Status" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <input value={filters.severity} onChange={(e) => setFilters((p) => ({ ...p, severity: e.target.value }))} placeholder="Severity" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <input value={filters.requirement} onChange={(e) => setFilters((p) => ({ ...p, requirement: e.target.value }))} placeholder="Requirement" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <input value={filters.violatable_type} onChange={(e) => setFilters((p) => ({ ...p, violatable_type: e.target.value }))} placeholder="Violatable Type" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <input type="date" value={filters.date_from} onChange={(e) => setFilters((p) => ({ ...p, date_from: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <input type="date" value={filters.date_to} onChange={(e) => setFilters((p) => ({ ...p, date_to: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
        </div>
      </section>

      <section className="ops-card p-4">
        <h3 className="mb-2 text-sm font-semibold">Violations</h3>
        {violationsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading violations...</p> : null}
        {violationsQuery.isError ? <p className="text-sm text-rose-300">Unable to load violations.</p> : null}
        {!violationsQuery.isLoading && !violationsQuery.isError && rows.length === 0 ? <p className="text-sm text-muted-foreground">No violations.</p> : null}
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="py-2">Violation #</th>
                  <th className="py-2">Requirement</th>
                  <th className="py-2">Severity</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Entity</th>
                  <th className="py-2">Date</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const r = row as Record<string, unknown>;
                  const id = (r.id ?? idx) as string | number;
                  return (
                    <tr key={String(id)} className="border-t border-border">
                      <td className="py-2 text-foreground">{String(r.violation_number ?? `V-${id}`)}</td>
                      <td className="py-2 text-muted-foreground">{String(r.requirement_code ?? r.requirement ?? "-")}</td>
                      <td className="py-2 text-muted-foreground">{String(r.severity ?? "-")}</td>
                      <td className="py-2 text-muted-foreground">{String(r.status ?? "-")}</td>
                      <td className="py-2 text-muted-foreground">{String(r.violatable_type ?? "-")}:{String(r.violatable_id ?? "-")}</td>
                      <td className="py-2 text-muted-foreground">{String(r.created_at ?? "-")}</td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className="rounded border border-border px-2 py-1 text-xs" onClick={() => setSelectedViolationId(id)}>Open</button>
                          <button type="button" className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300" onClick={() => updateMutation.mutate({ id, payload: { status: "resolved" } })}>
                            Resolve
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {selectedViolationId !== null ? (
        <section className="ops-card p-4">
          <h3 className="mb-2 text-sm font-semibold">Violation Detail & Waiver</h3>
          {detailQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading detail...</p> : null}
          {!detailQuery.isLoading ? (
            <>
              <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                <p>Requirement: <span className="text-muted-foreground">{String(detail.requirement_code ?? detail.requirement ?? "-")}</span></p>
                <p>Severity: <span className="text-muted-foreground">{String(detail.severity ?? "-")}</span></p>
                <p>Status: <span className="text-muted-foreground">{String(detail.status ?? "-")}</span></p>
                <p>Entity: <span className="text-muted-foreground">{String(detail.violatable_type ?? "-")}:{String(detail.violatable_id ?? "-")}</span></p>
                <p className="md:col-span-2">Details: <span className="text-muted-foreground">{String(detail.description ?? detail.message ?? "-")}</span></p>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <textarea value={waiverForm.reason} onChange={(e) => setWaiverForm((p) => ({ ...p, reason: e.target.value }))} placeholder="Waiver reason" className="h-20 rounded-lg border border-border bg-card px-3 py-2 text-sm" />
                <textarea value={waiverForm.conditions} onChange={(e) => setWaiverForm((p) => ({ ...p, conditions: e.target.value }))} placeholder="Conditions" className="h-20 rounded-lg border border-border bg-card px-3 py-2 text-sm" />
                <textarea value={waiverForm.risk_assessment} onChange={(e) => setWaiverForm((p) => ({ ...p, risk_assessment: e.target.value }))} placeholder="Risk assessment" className="h-20 rounded-lg border border-border bg-card px-3 py-2 text-sm" />
                <input type="date" value={waiverForm.effective_from} onChange={(e) => setWaiverForm((p) => ({ ...p, effective_from: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
                <input type="date" value={waiverForm.effective_to} onChange={(e) => setWaiverForm((p) => ({ ...p, effective_to: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
              </div>
              <button type="button" className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" onClick={() => waiverMutation.mutate({ id: selectedViolationId })}>
                {waiverMutation.isPending ? "Submitting..." : "Create Waiver"}
              </button>
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
