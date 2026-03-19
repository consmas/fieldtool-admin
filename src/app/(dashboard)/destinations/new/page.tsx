"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createDestination, previewDestinationRate } from "@/lib/api/destinations";
import type { Destination, RateCalculationResponse } from "@/types/api";

const defaults = {
  name: "",
  average_distance_km: "",
  base_km: "100",
  base_trip_cost: "0",
  kms_per_liter: "3",
  additional_provision_pct: "0.25",
  active: "true",
};

export default function NewDestinationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaults);
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<RateCalculationResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const { average_distance_km, base_km, base_trip_cost, kms_per_liter, additional_provision_pct } = form;
    const hasEnough =
      Number(average_distance_km) > 0 &&
      Number(base_km) > 0 &&
      Number(kms_per_liter) > 0;

    if (!hasEnough) {
      setPreview(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const result = await previewDestinationRate({
          average_distance_km: Number(average_distance_km),
          base_km: Number(base_km),
          base_trip_cost: Number(base_trip_cost),
          kms_per_liter: Number(kms_per_liter),
          additional_provision_pct: Number(additional_provision_pct),
        });
        setPreview(result);
      } catch {
        setPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [form.average_distance_km, form.base_km, form.base_trip_cost, form.kms_per_liter, form.additional_provision_pct]);

  const createMutation = useMutation({
    mutationFn: createDestination,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["destinations"] });
      router.push("/destinations");
    },
    onError: () => setMessage("Unable to create destination."),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const payload: Partial<Destination> = {
      name: form.name,
      average_distance_km: Number(form.average_distance_km),
      base_km: Number(form.base_km),
      base_trip_cost: Number(form.base_trip_cost),
      kms_per_liter: Number(form.kms_per_liter),
      additional_provision_pct: Number(form.additional_provision_pct),
      active: form.active === "true",
    };

    createMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Destinations</p>
          <h2 className="text-xl font-semibold">Create Destination</h2>
          <p className="text-sm text-muted-foreground">Add a new destination and baseline rate settings.</p>
        </div>
        <Link href="/destinations" className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-foreground">
          Back to List
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="ops-card p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Name</label>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Average Distance (km)</label>
            <input
              value={form.average_distance_km}
              onChange={(event) => setForm((prev) => ({ ...prev, average_distance_km: event.target.value }))}
              required
              type="number"
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Base KM</label>
            <input
              value={form.base_km}
              onChange={(event) => setForm((prev) => ({ ...prev, base_km: event.target.value }))}
              type="number"
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Other Costs / Base Trip Cost (GHS)</label>
            <input
              value={form.base_trip_cost}
              onChange={(event) => setForm((prev) => ({ ...prev, base_trip_cost: event.target.value }))}
              type="number"
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">KMs per Litre (fuel efficiency)</label>
            <input
              value={form.kms_per_liter}
              onChange={(event) => setForm((prev) => ({ ...prev, kms_per_liter: event.target.value }))}
              type="number"
              step="0.01"
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Fuel Provision % (e.g. 0.25 = 25%)</label>
            <input
              value={form.additional_provision_pct}
              onChange={(event) => setForm((prev) => ({ ...prev, additional_provision_pct: event.target.value }))}
              type="number"
              step="0.01"
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Active</label>
            <select
              value={form.active}
              onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </div>
        </div>

        {message ? (
          <p className="mt-4 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{message}</p>
        ) : null}

        <button
          type="submit"
          className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? "Creating..." : "Create Destination"}
        </button>
      </form>

      {(previewLoading || preview) && (
        <div className="ops-card p-6">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Rate Preview</h3>
          {previewLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">Calculating...</p>
          ) : preview ? (
            <>
              <div className="mt-3 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Expected Rate</p>
                <p className="text-2xl font-bold">
                  GHS {Number(preview.expected_rate).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                </p>
                {preview.fuel_price_used ? (
                  <p className="mt-1 text-xs text-muted-foreground">Fuel price: GHS {preview.fuel_price_used}/L</p>
                ) : null}
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3 text-xs text-muted-foreground">
                <div className="rounded-xl border border-border bg-muted/10 p-3">
                  <p className="uppercase tracking-widest">Base Fuel Cost</p>
                  <p className="font-semibold text-foreground">
                    GHS {Number(preview.base_fuel_cost).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="mt-1">Base {preview.base_km} km × {((1 + preview.additional_provision_pct) * 100 - 100).toFixed(0)}% provision</p>
                </div>
                {preview.route_extra_km > 0 && (
                  <div className="rounded-xl border border-border bg-muted/10 p-3">
                    <p className="uppercase tracking-widest">Extra Route Fuel</p>
                    <p className="font-semibold text-foreground">
                      GHS {Number(preview.extra_fuel_cost).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="mt-1">+{preview.route_extra_km} km beyond base</p>
                  </div>
                )}
                <div className="rounded-xl border border-border bg-muted/10 p-3">
                  <p className="uppercase tracking-widest">Other Costs</p>
                  <p className="font-semibold text-foreground">
                    GHS {Number(preview.other_cost).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="mt-1">Tolls, loading, etc.</p>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
