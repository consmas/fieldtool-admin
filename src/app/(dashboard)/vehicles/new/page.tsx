"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createVehicle } from "@/lib/api/vehicles";
import type { Vehicle } from "@/types/api";

const emptyForm = {
  name: "",
  kind: "truck",
  license_plate: "",
  truck_type_capacity: "",
  vin: "",
  notes: "",
  insurance_policy_number: "",
  insurance_provider: "",
  insurance_issued_at: "",
  insurance_expires_at: "",
  insurance_coverage_amount: "",
  insurance_notes: "",
  insurance_document_url: "",
  active: true,
};

export default function CreateVehiclePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: createVehicle,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      router.push("/vehicles");
    },
    onError: () => setMessage("Unable to create vehicle."),
  });

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Vehicles</p>
          <h2 className="text-lg font-semibold md:text-xl">Create Vehicle</h2>
        </div>
        <Link href="/vehicles" className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">
          Back to Vehicles
        </Link>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setMessage(null);

          const payload: Partial<Vehicle> = {
            name: form.name,
            kind: form.kind,
            license_plate: form.license_plate || undefined,
            truck_type_capacity: form.truck_type_capacity || undefined,
            vin: form.vin || undefined,
            notes: form.notes || undefined,
            insurance_policy_number: form.insurance_policy_number || undefined,
            insurance_provider: form.insurance_provider || undefined,
            insurance_issued_at: form.insurance_issued_at || undefined,
            insurance_expires_at: form.insurance_expires_at || undefined,
            insurance_coverage_amount: form.insurance_coverage_amount || undefined,
            insurance_notes: form.insurance_notes || undefined,
            insurance_document_url: form.insurance_document_url || undefined,
            active: form.active,
          };

          createMutation.mutate(payload);
        }}
        className="ops-card p-4 sm:p-6"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Name</label>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Kind</label>
            <select
              value={form.kind}
              onChange={(event) => setForm((prev) => ({ ...prev, kind: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            >
              <option value="truck">truck</option>
              <option value="trailer">trailer</option>
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">License Plate</label>
            <input
              value={form.license_plate}
              onChange={(event) => setForm((prev) => ({ ...prev, license_plate: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Truck Type / Capacity</label>
            <input
              value={form.truck_type_capacity}
              onChange={(event) => setForm((prev) => ({ ...prev, truck_type_capacity: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">VIN</label>
            <input
              value={form.vin}
              onChange={(event) => setForm((prev) => ({ ...prev, vin: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Insurance Policy Number</label>
            <input
              value={form.insurance_policy_number}
              onChange={(event) => setForm((prev) => ({ ...prev, insurance_policy_number: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Insurance Provider</label>
            <input
              value={form.insurance_provider}
              onChange={(event) => setForm((prev) => ({ ...prev, insurance_provider: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Insurance Issued At</label>
            <input
              type="date"
              value={form.insurance_issued_at}
              onChange={(event) => setForm((prev) => ({ ...prev, insurance_issued_at: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Insurance Expires At</label>
            <input
              type="date"
              value={form.insurance_expires_at}
              onChange={(event) => setForm((prev) => ({ ...prev, insurance_expires_at: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Insurance Coverage Amount</label>
            <input
              value={form.insurance_coverage_amount}
              onChange={(event) => setForm((prev) => ({ ...prev, insurance_coverage_amount: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Insurance Document URL</label>
            <input
              value={form.insurance_document_url}
              onChange={(event) => setForm((prev) => ({ ...prev, insurance_document_url: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Active</label>
            <select
              value={form.active ? "true" : "false"}
              onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.value === "true" }))}
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Notes</label>
            <input
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Insurance Notes</label>
            <input
              value={form.insurance_notes}
              onChange={(event) => setForm((prev) => ({ ...prev, insurance_notes: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
        </div>

        {message ? (
          <p className="mt-4 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          className="mt-4 w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground sm:w-auto"
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? "Creating..." : "Create Vehicle"}
        </button>
      </form>
    </div>
  );
}
