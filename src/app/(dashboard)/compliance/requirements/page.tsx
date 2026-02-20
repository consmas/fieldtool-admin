"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createComplianceRequirement,
  fetchComplianceRequirements,
  updateComplianceRequirement,
} from "@/lib/api/compliance_incidents";

type RequirementForm = {
  id: string;
  code: string;
  category: string;
  applies_to: string;
  enforcement_level: string;
  check_type: string;
  frequency: string;
  jurisdiction: string;
  active: boolean;
  auto_check_config: string;
};

const emptyForm: RequirementForm = {
  id: "",
  code: "",
  category: "",
  applies_to: "",
  enforcement_level: "warning",
  check_type: "manual",
  frequency: "",
  jurisdiction: "",
  active: true,
  auto_check_config: "{}",
};

export default function ComplianceRequirementsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<RequirementForm>(emptyForm);
  const [message, setMessage] = useState<string | null>(null);

  const requirementsQuery = useQuery({
    queryKey: ["compliance", "requirements"],
    queryFn: fetchComplianceRequirements,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        code: form.code,
        category: form.category,
        applies_to: form.applies_to,
        enforcement_level: form.enforcement_level,
        check_type: form.check_type,
        frequency: form.frequency || undefined,
        jurisdiction: form.jurisdiction || undefined,
        active: form.active,
        auto_check_config: (() => {
          try {
            return JSON.parse(form.auto_check_config || "{}");
          } catch {
            return {};
          }
        })(),
      };
      if (form.id) return updateComplianceRequirement(form.id, payload);
      return createComplianceRequirement(payload);
    },
    onSuccess: async () => {
      setMessage(form.id ? "Requirement updated." : "Requirement created.");
      setForm(emptyForm);
      await queryClient.invalidateQueries({ queryKey: ["compliance", "requirements"] });
    },
    onError: () => setMessage("Unable to save requirement."),
  });

  const rows = useMemo(() => requirementsQuery.data ?? [], [requirementsQuery.data]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ops-section-title">Compliance</p>
          <h2 className="text-lg font-semibold md:text-xl">Requirements Management</h2>
        </div>
        <Link href="/compliance" className="rounded-lg border border-border px-3 py-2 text-sm">Back to Compliance</Link>
      </div>

      <section className="ops-card p-4">
        <h3 className="mb-3 text-sm font-semibold">{form.id ? "Edit Requirement" : "Create Requirement"}</h3>
        <div className="grid gap-3 md:grid-cols-4">
          <input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} placeholder="Code" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} placeholder="Category" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <input value={form.applies_to} onChange={(e) => setForm((p) => ({ ...p, applies_to: e.target.value }))} placeholder="Applies to" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <select value={form.enforcement_level} onChange={(e) => setForm((p) => ({ ...p, enforcement_level: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option value="warning">warning</option>
            <option value="blocker">blocker</option>
          </select>
          <input value={form.check_type} onChange={(e) => setForm((p) => ({ ...p, check_type: e.target.value }))} placeholder="Check type" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <input value={form.frequency} onChange={(e) => setForm((p) => ({ ...p, frequency: e.target.value }))} placeholder="Frequency" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <input value={form.jurisdiction} onChange={(e) => setForm((p) => ({ ...p, jurisdiction: e.target.value }))} placeholder="Jurisdiction" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))} />
            Active
          </label>
        </div>
        <textarea value={form.auto_check_config} onChange={(e) => setForm((p) => ({ ...p, auto_check_config: e.target.value }))} className="mt-3 h-28 w-full rounded-lg border border-border bg-card px-3 py-2 font-mono text-xs" />
        {message ? <p className="mt-2 text-xs text-muted-foreground">{message}</p> : null}
        <button type="button" className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" onClick={() => saveMutation.mutate()}>
          {saveMutation.isPending ? "Saving..." : form.id ? "Update Requirement" : "Create Requirement"}
        </button>
      </section>

      <section className="ops-card p-4">
        <h3 className="mb-2 text-sm font-semibold">Requirements</h3>
        {requirementsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading requirements...</p> : null}
        {!requirementsQuery.isLoading && rows.length === 0 ? <p className="text-sm text-muted-foreground">No requirements.</p> : null}
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-sm">
              <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="py-2">Code</th>
                  <th className="py-2">Category</th>
                  <th className="py-2">Applies To</th>
                  <th className="py-2">Enforcement</th>
                  <th className="py-2">Check Type</th>
                  <th className="py-2">Frequency</th>
                  <th className="py-2">Jurisdiction</th>
                  <th className="py-2">Active</th>
                  <th className="py-2">Auto Check Config</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const r = row as Record<string, unknown>;
                  const id = String(r.id ?? idx);
                  return (
                    <tr key={id} className="border-t border-border align-top">
                      <td className="py-2 text-foreground">{String(r.code ?? "-")}</td>
                      <td className="py-2 text-muted-foreground">{String(r.category ?? "-")}</td>
                      <td className="py-2 text-muted-foreground">{String(r.applies_to ?? "-")}</td>
                      <td className="py-2 text-muted-foreground">{String(r.enforcement_level ?? "-")}</td>
                      <td className="py-2 text-muted-foreground">{String(r.check_type ?? "-")}</td>
                      <td className="py-2 text-muted-foreground">{String(r.frequency ?? "-")}</td>
                      <td className="py-2 text-muted-foreground">{String(r.jurisdiction ?? "-")}</td>
                      <td className="py-2 text-muted-foreground">{String(r.active ?? "-")}</td>
                      <td className="py-2 text-muted-foreground"><pre className="max-w-[280px] overflow-x-auto text-xs">{JSON.stringify(r.auto_check_config ?? {}, null, 2)}</pre></td>
                      <td className="py-2">
                        <button type="button" className="rounded border border-border px-2 py-1 text-xs" onClick={() => setForm({
                          id,
                          code: String(r.code ?? ""),
                          category: String(r.category ?? ""),
                          applies_to: String(r.applies_to ?? ""),
                          enforcement_level: String(r.enforcement_level ?? "warning"),
                          check_type: String(r.check_type ?? "manual"),
                          frequency: String(r.frequency ?? ""),
                          jurisdiction: String(r.jurisdiction ?? ""),
                          active: String(r.active ?? true) === "true",
                          auto_check_config: JSON.stringify(r.auto_check_config ?? {}, null, 2),
                        })}>
                          Edit
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
    </div>
  );
}
