"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchVehicles, updateVehicle } from "@/lib/api/vehicles";
import type { Vehicle } from "@/types/api";

function statusFromExpiry(expiry?: string | null) {
  if (!expiry) return { label: "Missing", className: "border-rose-500/30 bg-rose-500/10 text-rose-300" };
  const ts = new Date(expiry).getTime();
  if (!Number.isFinite(ts)) return { label: "Unknown", className: "border-border bg-card text-muted-foreground" };
  const days = Math.ceil((ts - Date.now()) / (24 * 60 * 60 * 1000));
  if (days < 0) return { label: "Expired", className: "border-rose-500/30 bg-rose-500/10 text-rose-300" };
  if (days <= 30) return { label: "Expiring Soon", className: "border-amber-500/30 bg-amber-500/10 text-amber-300" };
  return { label: "Active", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" };
}

type InsuranceForm = {
  vehicle_id: string;
  insurance_policy_number: string;
  insurance_provider: string;
  insurance_issued_at: string;
  insurance_expires_at: string;
  insurance_coverage_amount: string;
  insurance_notes: string;
  insurance_document_url: string;
};

const emptyForm: InsuranceForm = {
  vehicle_id: "",
  insurance_policy_number: "",
  insurance_provider: "",
  insurance_issued_at: "",
  insurance_expires_at: "",
  insurance_coverage_amount: "",
  insurance_notes: "",
  insurance_document_url: "",
};

export default function InsurancePage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<InsuranceForm>(emptyForm);
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const vehiclesQuery = useQuery({
    queryKey: ["insurance", "vehicles"],
    queryFn: fetchVehicles,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.vehicle_id) throw new Error("Select vehicle");
      if (insuranceFile) {
        const fd = new FormData();
        if (form.insurance_policy_number) fd.append("vehicle[insurance_policy_number]", form.insurance_policy_number);
        if (form.insurance_provider) fd.append("vehicle[insurance_provider]", form.insurance_provider);
        if (form.insurance_issued_at) fd.append("vehicle[insurance_issued_at]", form.insurance_issued_at);
        if (form.insurance_expires_at) fd.append("vehicle[insurance_expires_at]", form.insurance_expires_at);
        if (form.insurance_coverage_amount) fd.append("vehicle[insurance_coverage_amount]", form.insurance_coverage_amount);
        if (form.insurance_notes) fd.append("vehicle[insurance_notes]", form.insurance_notes);
        if (form.insurance_document_url) fd.append("vehicle[insurance_document_url]", form.insurance_document_url);
        fd.append("vehicle[insurance_document]", insuranceFile);
        fd.append("insurance_document", insuranceFile);
        return updateVehicle(Number(form.vehicle_id), fd);
      }
      return updateVehicle(Number(form.vehicle_id), {
        insurance_policy_number: form.insurance_policy_number || undefined,
        insurance_provider: form.insurance_provider || undefined,
        insurance_issued_at: form.insurance_issued_at || undefined,
        insurance_expires_at: form.insurance_expires_at || undefined,
        insurance_coverage_amount: form.insurance_coverage_amount || undefined,
        insurance_notes: form.insurance_notes || undefined,
        insurance_document_url: form.insurance_document_url || undefined,
      } as Partial<Vehicle>);
    },
    onSuccess: async () => {
      setMessage("Insurance updated.");
      setInsuranceFile(null);
      await queryClient.invalidateQueries({ queryKey: ["insurance", "vehicles"] });
      await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: () => setMessage("Unable to update insurance."),
  });

  const vehicles = useMemo(() => vehiclesQuery.data ?? [], [vehiclesQuery.data]);
  const activeVehicles = useMemo(
    () => vehicles.filter((v) => statusFromExpiry(v.insurance_expires_at).label === "Active").length,
    [vehicles]
  );
  const expiringVehicles = useMemo(
    () => vehicles.filter((v) => statusFromExpiry(v.insurance_expires_at).label === "Expiring Soon").length,
    [vehicles]
  );
  const expiredVehicles = useMemo(
    () => vehicles.filter((v) => statusFromExpiry(v.insurance_expires_at).label === "Expired").length,
    [vehicles]
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <p className="ops-section-title">Insurance</p>
        <h2 className="text-lg font-semibold md:text-xl">Vehicle Insurance Management</h2>
        <p className="text-sm text-muted-foreground">Policy lifecycle, expiry countdown, and insurance file management.</p>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <article className="ops-card p-4"><p className="ops-section-title">Active</p><p className="mt-2 text-2xl font-bold text-emerald-300">{activeVehicles}</p></article>
        <article className="ops-card p-4"><p className="ops-section-title">Expiring Soon</p><p className="mt-2 text-2xl font-bold text-amber-300">{expiringVehicles}</p></article>
        <article className="ops-card p-4"><p className="ops-section-title">Expired</p><p className="mt-2 text-2xl font-bold text-rose-300">{expiredVehicles}</p></article>
      </section>

      <section className="ops-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Update Insurance</h3>
        <div className="grid gap-3 md:grid-cols-4">
          <select value={form.vehicle_id} onChange={(e) => {
            const vehicle = vehicles.find((v) => String(v.id) === e.target.value);
            setForm({
              vehicle_id: e.target.value,
              insurance_policy_number: String(vehicle?.insurance_policy_number ?? ""),
              insurance_provider: String(vehicle?.insurance_provider ?? ""),
              insurance_issued_at: String(vehicle?.insurance_issued_at ?? ""),
              insurance_expires_at: String(vehicle?.insurance_expires_at ?? ""),
              insurance_coverage_amount: String(vehicle?.insurance_coverage_amount ?? ""),
              insurance_notes: String(vehicle?.insurance_notes ?? ""),
              insurance_document_url: String(vehicle?.insurance?.document_url ?? vehicle?.insurance_document_url ?? ""),
            });
          }} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option value="">Select vehicle</option>
            {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>)}
          </select>
          <input value={form.insurance_policy_number} onChange={(e) => setForm((p) => ({ ...p, insurance_policy_number: e.target.value }))} placeholder="Policy number" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <input value={form.insurance_provider} onChange={(e) => setForm((p) => ({ ...p, insurance_provider: e.target.value }))} placeholder="Provider" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <input type="date" value={form.insurance_issued_at} onChange={(e) => setForm((p) => ({ ...p, insurance_issued_at: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <input type="date" value={form.insurance_expires_at} onChange={(e) => setForm((p) => ({ ...p, insurance_expires_at: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <input value={form.insurance_coverage_amount} onChange={(e) => setForm((p) => ({ ...p, insurance_coverage_amount: e.target.value }))} placeholder="Coverage amount" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <input value={form.insurance_document_url} onChange={(e) => setForm((p) => ({ ...p, insurance_document_url: e.target.value }))} placeholder="Document URL (optional)" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <input type="file" onChange={(e) => setInsuranceFile(e.target.files?.[0] ?? null)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
        </div>
        <textarea value={form.insurance_notes} onChange={(e) => setForm((p) => ({ ...p, insurance_notes: e.target.value }))} placeholder="Notes" className="mt-3 h-20 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" />
        {message ? <p className="mt-2 text-xs text-muted-foreground">{message}</p> : null}
        <button type="button" className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" onClick={() => saveMutation.mutate()}>
          {saveMutation.isPending ? "Saving..." : "Save Insurance"}
        </button>
      </section>

      <section className="ops-card p-4">
        <h3 className="mb-2 text-sm font-semibold">Insurance Register</h3>
        {vehiclesQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading vehicles...</p> : null}
        {vehiclesQuery.isError ? <p className="text-sm text-rose-300">Unable to load vehicles.</p> : null}
        {!vehiclesQuery.isLoading && !vehiclesQuery.isError ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="py-2">Vehicle</th>
                  <th className="py-2">Policy Number</th>
                  <th className="py-2">Provider</th>
                  <th className="py-2">Issued</th>
                  <th className="py-2">Expiry</th>
                  <th className="py-2">Coverage</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Document</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle) => {
                  const status = statusFromExpiry(vehicle.insurance_expires_at);
                  const docUrl = vehicle.insurance?.document_url ?? vehicle.insurance_document_url;
                  return (
                    <tr key={vehicle.id} className="border-t border-border">
                      <td className="py-2 text-foreground">{vehicle.name}</td>
                      <td className="py-2 text-muted-foreground">{vehicle.insurance_policy_number ?? "-"}</td>
                      <td className="py-2 text-muted-foreground">{vehicle.insurance_provider ?? "-"}</td>
                      <td className="py-2 text-muted-foreground">{vehicle.insurance_issued_at ?? "-"}</td>
                      <td className="py-2 text-muted-foreground">{vehicle.insurance_expires_at ?? "-"}</td>
                      <td className="py-2 text-muted-foreground">{vehicle.insurance_coverage_amount ?? "-"}</td>
                      <td className="py-2"><span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>{status.label}</span></td>
                      <td className="py-2">{docUrl ? <a href={String(docUrl)} target="_blank" rel="noreferrer" className="rounded border border-border px-2 py-1 text-xs">Open</a> : <span className="text-xs text-muted-foreground">No file</span>}</td>
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
