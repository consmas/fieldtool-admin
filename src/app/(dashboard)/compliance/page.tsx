"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchDrivers } from "@/lib/api/driver_intelligence";
import {
  createDriverDocument,
  fetchDriverComplianceSummary,
  fetchDriverDocuments,
  fetchExpiringDriverDocuments,
  updateDriverDocument,
  verifyDriverDocument,
} from "@/lib/api/driver_intelligence";

function toNumber(v: unknown) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

type DocForm = {
  id: string;
  driver_id: string;
  document_type: string;
  document_number: string;
  issued_date: string;
  expiry_date: string;
  status: string;
  verification_status: string;
  notes: string;
};

const emptyForm: DocForm = {
  id: "",
  driver_id: "",
  document_type: "",
  document_number: "",
  issued_date: "",
  expiry_date: "",
  status: "active",
  verification_status: "pending",
  notes: "",
};

export default function CompliancePage() {
  const queryClient = useQueryClient();
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [daysFilter, setDaysFilter] = useState("30");
  const [form, setForm] = useState<DocForm>(emptyForm);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const driversQuery = useQuery({
    queryKey: ["compliance", "drivers"],
    queryFn: fetchDrivers,
  });
  const complianceSummaryQuery = useQuery({
    queryKey: ["compliance", "summary"],
    queryFn: fetchDriverComplianceSummary,
  });
  const driverDocsQuery = useQuery({
    queryKey: ["compliance", "driver-documents", selectedDriverId],
    queryFn: () => fetchDriverDocuments(selectedDriverId),
    enabled: Boolean(selectedDriverId),
  });
  const expiringDocsQuery = useQuery({
    queryKey: ["compliance", "expiring-docs", daysFilter],
    queryFn: () => fetchExpiringDriverDocuments({ days: Number(daysFilter) || 30 }),
  });

  const saveDocMutation = useMutation({
    mutationFn: async () => {
      if (!form.driver_id) throw new Error("Select a driver.");
      const payload = documentFile
        ? (() => {
            const fd = new FormData();
            fd.append("document_type", form.document_type);
            fd.append("document_number", form.document_number);
            if (form.issued_date) fd.append("issued_date", form.issued_date);
            if (form.expiry_date) fd.append("expiry_date", form.expiry_date);
            if (form.status) fd.append("status", form.status);
            if (form.verification_status) fd.append("verification_status", form.verification_status);
            if (form.notes) fd.append("notes", form.notes);
            fd.append("file", documentFile);
            return fd;
          })()
        : {
            document_type: form.document_type,
            document_number: form.document_number,
            issued_date: form.issued_date || undefined,
            expiry_date: form.expiry_date || undefined,
            status: form.status || undefined,
            verification_status: form.verification_status || undefined,
            notes: form.notes || undefined,
          };
      if (form.id) return updateDriverDocument(form.driver_id, form.id, payload);
      return createDriverDocument(form.driver_id, payload);
    },
    onSuccess: async () => {
      setMessage(form.id ? "Document updated." : "Document uploaded.");
      setForm(emptyForm);
      setDocumentFile(null);
      await queryClient.invalidateQueries({ queryKey: ["compliance", "driver-documents"] });
      await queryClient.invalidateQueries({ queryKey: ["compliance", "summary"] });
      await queryClient.invalidateQueries({ queryKey: ["compliance", "expiring-docs"] });
    },
    onError: () => setMessage("Unable to save document."),
  });

  const verifyMutation = useMutation({
    mutationFn: ({ driverId, documentId, status }: { driverId: string; documentId: string | number; status: "verified" | "rejected" }) =>
      verifyDriverDocument(driverId, documentId, { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["compliance", "driver-documents"] });
      await queryClient.invalidateQueries({ queryKey: ["compliance", "summary"] });
    },
  });

  const drivers = useMemo(() => driversQuery.data ?? [], [driversQuery.data]);
  const docs = useMemo(() => driverDocsQuery.data ?? [], [driverDocsQuery.data]);
  const expiringDocs = useMemo(() => expiringDocsQuery.data ?? [], [expiringDocsQuery.data]);
  const summary = useMemo(() => (complianceSummaryQuery.data ?? {}) as Record<string, unknown>, [complianceSummaryQuery.data]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <p className="ops-section-title">Compliance</p>
        <h2 className="text-lg font-semibold md:text-xl">Driver Documents</h2>
        <p className="text-sm text-muted-foreground">Lifecycle management for driver documents, verification and expiry controls.</p>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="ops-card p-4"><p className="ops-section-title">Active</p><p className="mt-2 text-2xl font-bold">{toNumber(summary.active_count ?? summary.active)}</p></article>
        <article className="ops-card p-4"><p className="ops-section-title">Expiring Soon</p><p className="mt-2 text-2xl font-bold">{toNumber(summary.expiring_count ?? summary.expiring_30_days)}</p></article>
        <article className="ops-card p-4"><p className="ops-section-title">Expired</p><p className="mt-2 text-2xl font-bold text-rose-300">{toNumber(summary.expired_count ?? summary.expired)}</p></article>
        <article className="ops-card p-4"><p className="ops-section-title">Unverified</p><p className="mt-2 text-2xl font-bold text-amber-300">{toNumber(summary.unverified_count ?? summary.pending_verification)}</p></article>
      </section>

      <section className="ops-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Upload / Update Document</h3>
        <div className="grid gap-3 md:grid-cols-4">
          <select value={form.driver_id} onChange={(e) => { setForm((p) => ({ ...p, driver_id: e.target.value })); setSelectedDriverId(e.target.value); }} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option value="">Select driver</option>
            {drivers.map((driver) => {
              const row = driver as Record<string, unknown>;
              return <option key={String(row.id)} value={String(row.id)}>{String(row.name ?? row.email ?? `Driver ${row.id}`)}</option>;
            })}
          </select>
          <input value={form.document_type} onChange={(e) => setForm((p) => ({ ...p, document_type: e.target.value }))} placeholder="Document type" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <input value={form.document_number} onChange={(e) => setForm((p) => ({ ...p, document_number: e.target.value }))} placeholder="Document number" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <input type="date" value={form.issued_date} onChange={(e) => setForm((p) => ({ ...p, issued_date: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <input type="date" value={form.expiry_date} onChange={(e) => setForm((p) => ({ ...p, expiry_date: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option value="active">active</option>
            <option value="expiring_soon">expiring_soon</option>
            <option value="expired">expired</option>
          </select>
          <select value={form.verification_status} onChange={(e) => setForm((p) => ({ ...p, verification_status: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option value="pending">pending</option>
            <option value="verified">verified</option>
            <option value="rejected">rejected</option>
          </select>
          <input type="file" onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
        </div>
        <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes / reason" className="mt-3 h-20 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" />
        {message ? <p className="mt-2 text-xs text-muted-foreground">{message}</p> : null}
        <button type="button" onClick={() => saveDocMutation.mutate()} className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          {saveDocMutation.isPending ? "Saving..." : form.id ? "Update Document" : "Upload Document"}
        </button>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="ops-card p-4">
          <h3 className="mb-2 text-sm font-semibold">Driver Documents</h3>
          {!selectedDriverId ? <p className="text-sm text-muted-foreground">Select a driver to view documents.</p> : null}
          {driverDocsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading documents...</p> : null}
          {!driverDocsQuery.isLoading && docs.length === 0 && selectedDriverId ? <p className="text-sm text-muted-foreground">No documents.</p> : null}
          <div className="space-y-2">
            {docs.map((row, i) => {
              const doc = row as Record<string, unknown>;
              const docId = String(doc.id ?? i);
              return (
                <div key={docId} className="rounded border border-border p-3 text-sm">
                  <p className="font-medium text-foreground">{String(doc.document_type ?? doc.type ?? "Document")}</p>
                  <p className="text-xs text-muted-foreground">
                    #{String(doc.document_number ?? "-")} · Issued {String(doc.issued_date ?? "-")} · Expiry {String(doc.expiry_date ?? "-")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Status {String(doc.status ?? "-")} · Verification {String(doc.verification_status ?? "-")} · Days-to-expiry {String(doc.days_to_expiry ?? "-")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" className="rounded border border-border px-2 py-1 text-xs" onClick={() => setForm({
                      id: docId,
                      driver_id: selectedDriverId,
                      document_type: String(doc.document_type ?? doc.type ?? ""),
                      document_number: String(doc.document_number ?? ""),
                      issued_date: String(doc.issued_date ?? ""),
                      expiry_date: String(doc.expiry_date ?? ""),
                      status: String(doc.status ?? "active"),
                      verification_status: String(doc.verification_status ?? "pending"),
                      notes: String(doc.notes ?? ""),
                    })}>
                      Edit
                    </button>
                    <button type="button" className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300" onClick={() => verifyMutation.mutate({ driverId: selectedDriverId, documentId: docId, status: "verified" })}>
                      Verify
                    </button>
                    <button type="button" className="rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs text-rose-300" onClick={() => verifyMutation.mutate({ driverId: selectedDriverId, documentId: docId, status: "rejected" })}>
                      Reject
                    </button>
                    {doc.file_url ? <a href={String(doc.file_url)} target="_blank" rel="noreferrer" className="rounded border border-border px-2 py-1 text-xs">Open File</a> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="ops-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Expiring / Expired</h3>
            <select value={daysFilter} onChange={(e) => setDaysFilter(e.target.value)} className="rounded-lg border border-border bg-card px-2 py-1 text-xs">
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
            </select>
          </div>
          {expiringDocsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading expiring docs...</p> : null}
          {!expiringDocsQuery.isLoading && expiringDocs.length === 0 ? <p className="text-sm text-muted-foreground">No expiring docs.</p> : null}
          <div className="space-y-2">
            {expiringDocs.map((row, i) => {
              const doc = row as Record<string, unknown>;
              const days = toNumber(doc.days_to_expiry);
              const className = days < 0 ? "border-rose-500/30 bg-rose-500/10" : days <= 30 ? "border-amber-500/30 bg-amber-500/10" : "border-emerald-500/30 bg-emerald-500/10";
              return (
                <div key={i} className={`rounded border p-3 text-sm ${className}`}>
                  <p className="font-medium text-foreground">{String(doc.driver_name ?? doc.driver ?? `Driver ${doc.driver_id ?? "-"}`)}</p>
                  <p className="text-xs text-muted-foreground">
                    {String(doc.document_type ?? "-")} · Expires {String(doc.expiry_date ?? "-")} · {days < 0 ? "Expired" : `${days} days left`}
                  </p>
                </div>
              );
            })}
          </div>
        </article>
      </section>
    </div>
  );
}
