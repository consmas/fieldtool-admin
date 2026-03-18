"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchVehicle, updateVehicle } from "@/lib/api/vehicles";
import { formatDate } from "@/lib/utils/format";

function insuranceStatus(expiry?: string | null) {
  if (!expiry) return { label: "No Expiry Set", className: "border-border bg-card text-muted-foreground" };
  const ts = new Date(expiry).getTime();
  if (!Number.isFinite(ts)) return { label: "Unknown", className: "border-border bg-card text-muted-foreground" };
  const days = Math.ceil((ts - Date.now()) / (24 * 60 * 60 * 1000));
  if (days < 0) return { label: "Expired", className: "border-rose-500/30 bg-rose-500/10 text-rose-300" };
  if (days <= 30) return { label: `Expiring in ${days}d`, className: "border-amber-500/30 bg-amber-500/10 text-amber-300" };
  return { label: `Active · ${days}d remaining`, className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" };
}

export default function VehicleInsurancePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const vehicleId = Number(params?.id ?? 0);

  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const { data: vehicle, isLoading, isError } = useQuery({
    queryKey: ["vehicles", "detail", vehicleId],
    queryFn: () => fetchVehicle(vehicleId),
    enabled: Number.isFinite(vehicleId) && vehicleId > 0,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: FormData) => updateVehicle(vehicleId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["vehicles", "detail", vehicleId] });
      setMessage({ tone: "success", text: "Insurance updated successfully." });
      setInsuranceFile(null);
    },
    onError: () => setMessage({ tone: "error", text: "Unable to update insurance." }),
  });

  if (isLoading) return <div className="ops-card p-6 text-sm text-muted-foreground">Loading vehicle...</div>;
  if (isError || !vehicle) {
    return <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-300">Unable to load vehicle.</div>;
  }

  const status = insuranceStatus(vehicle.insurance_expires_at);
  const documentUrl = vehicle.insurance?.document_url ?? vehicle.insurance_document_url ?? null;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Vehicles / {vehicle.name}
          </p>
          <h2 className="text-lg font-semibold md:text-xl">Insurance</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/vehicles/${vehicleId}/edit`} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">
            Edit Vehicle
          </Link>
          <Link href={`/vehicles/${vehicleId}`} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">
            Back to Vehicle
          </Link>
        </div>
      </div>

      {/* Current insurance summary */}
      <section className="ops-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Current Insurance</h3>
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>
            {status.label}
          </span>
        </div>
        <dl className="grid gap-2 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Policy Number</dt>
            <dd className="mt-0.5 font-medium text-foreground">{vehicle.insurance_policy_number ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Provider</dt>
            <dd className="mt-0.5 font-medium text-foreground">{vehicle.insurance_provider ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Issued</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {vehicle.insurance_issued_at ? formatDate(vehicle.insurance_issued_at) : "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Expires</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {vehicle.insurance_expires_at ? formatDate(vehicle.insurance_expires_at) : "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Coverage Amount</dt>
            <dd className="mt-0.5 font-medium text-foreground">{vehicle.insurance_coverage_amount ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Notes</dt>
            <dd className="mt-0.5 font-medium text-foreground">{vehicle.insurance_notes ?? "-"}</dd>
          </div>
        </dl>
        {documentUrl ? (
          <a
            href={String(documentUrl)}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-card"
          >
            Open Insurance Document
          </a>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">No insurance document attached.</p>
        )}
      </section>

      {/* Update form */}
      <section className="ops-card p-4">
        <h3 className="mb-4 text-sm font-semibold">Update Insurance</h3>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setMessage(null);
            const fd = new FormData(event.currentTarget);
            const payload = new FormData();

            const appendField = (key: string, value: FormDataEntryValue | null) => {
              if (value === null || value === undefined) return;
              const asText = typeof value === "string" ? value.trim() : value;
              if (typeof asText === "string" && !asText) return;
              payload.append(key, asText);
              payload.append(`vehicle[${key}]`, asText);
            };

            appendField("insurance_policy_number", fd.get("insurance_policy_number"));
            appendField("insurance_provider", fd.get("insurance_provider"));
            appendField("insurance_issued_at", fd.get("insurance_issued_at"));
            appendField("insurance_expires_at", fd.get("insurance_expires_at"));
            appendField("insurance_coverage_amount", fd.get("insurance_coverage_amount"));
            appendField("insurance_notes", fd.get("insurance_notes"));

            if (insuranceFile) {
              payload.append("insurance_document", insuranceFile);
              payload.append("vehicle[insurance_document]", insuranceFile);
            }

            updateMutation.mutate(payload);
          }}
          className="grid gap-4 md:grid-cols-2"
        >
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Policy Number</label>
            <input
              name="insurance_policy_number"
              defaultValue={vehicle.insurance_policy_number ?? ""}
              placeholder="e.g. POL-123456"
              className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Provider</label>
            <input
              name="insurance_provider"
              defaultValue={vehicle.insurance_provider ?? ""}
              placeholder="e.g. StarLife Assurance"
              className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Issued Date</label>
            <input
              type="date"
              name="insurance_issued_at"
              defaultValue={vehicle.insurance_issued_at ?? ""}
              className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Expiry Date</label>
            <input
              type="date"
              name="insurance_expires_at"
              defaultValue={vehicle.insurance_expires_at ?? ""}
              className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Coverage Amount</label>
            <input
              name="insurance_coverage_amount"
              defaultValue={String(vehicle.insurance_coverage_amount ?? "")}
              placeholder="e.g. 50000.00"
              className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Insurance Document
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setInsuranceFile(e.target.files?.[0] ?? null)}
                className="mt-2 block w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
              />
            </label>
            {insuranceFile ? (
              <p className="mt-1 text-xs text-muted-foreground">Selected: {insuranceFile.name}</p>
            ) : null}
          </div>
          <div className="md:col-span-2">
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Notes</label>
            <textarea
              name="insurance_notes"
              defaultValue={vehicle.insurance_notes ?? ""}
              rows={3}
              placeholder="Any additional notes about this policy..."
              className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
            />
          </div>

          {message ? (
            <p className={`md:col-span-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs ${message.tone === "success" ? "text-emerald-300" : "text-rose-300"}`}>
              {message.text}
            </p>
          ) : null}

          <div className="md:col-span-2 flex gap-3">
            <button
              type="submit"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Insurance"}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/vehicles/${vehicleId}`)}
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
