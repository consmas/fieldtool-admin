"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createDestination, previewDestinationRate } from "@/lib/api/destinations";
import {
  buildDestinationPayload,
  canPreviewDestination,
  destinationFormDefaults,
  getApiErrorMessage,
  validateDestinationForm,
} from "@/lib/destinations";
import type { RateCalculationResponse } from "@/types/api";

export default function NewDestinationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(destinationFormDefaults);
  const [mode, setMode] = useState<"system" | "manual">("system");
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<RateCalculationResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!canPreviewDestination(form, mode)) {
      setPreview(null);
      return;
    }

    const payload = buildDestinationPayload(form, mode);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const result = await previewDestinationRate({ destination: payload });
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
  }, [form, mode]);

  const createMutation = useMutation({
    mutationFn: createDestination,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["destinations"] });
      router.push("/destinations");
    },
    onError: (error) => setMessage(getApiErrorMessage(error, "Unable to create destination.")),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const validationMessage = validateDestinationForm(form, mode);
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    createMutation.mutate(buildDestinationPayload(form, mode));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Destinations</p>
          <h2 className="text-xl font-semibold">Create Destination</h2>
          <p className="text-sm text-muted-foreground">Choose system pricing or a fixed manual rate for the destination.</p>
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
              step="0.01"
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Pricing Mode</label>
            <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-border p-1">
              <button
                type="button"
                onClick={() => setMode("system")}
                className={`rounded-lg px-3 py-2 text-sm ${mode === "system" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                Use system calculation
              </button>
              <button
                type="button"
                onClick={() => setMode("manual")}
                className={`rounded-lg px-3 py-2 text-sm ${mode === "manual" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                Use manual rate
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Additional Provision %</label>
            <input
              value={form.additional_provision_pct}
              onChange={(event) => setForm((prev) => ({ ...prev, additional_provision_pct: event.target.value }))}
              type="number"
              step="0.01"
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
              placeholder="25 or 0.25"
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

        {mode === "system" ? (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border p-4">
              <h3 className="text-sm font-semibold">System Calculation</h3>
              <p className="mt-1 text-xs text-muted-foreground">Base rate covers the first base KM. Extra KM is charged from fuel usage.</p>
              <div className="mt-4 grid gap-4">
                <input
                  value={form.base_km}
                  onChange={(event) => setForm((prev) => ({ ...prev, base_km: event.target.value }))}
                  type="number"
                  step="0.01"
                  className="rounded-xl border border-border px-3 py-2 text-sm"
                  placeholder="Base KM"
                />
                <input
                  value={form.base_trip_cost}
                  onChange={(event) => setForm((prev) => ({ ...prev, base_trip_cost: event.target.value }))}
                  type="number"
                  step="0.01"
                  className="rounded-xl border border-border px-3 py-2 text-sm"
                  placeholder="Base Rate"
                />
                <input
                  value={form.liters_per_km}
                  onChange={(event) => setForm((prev) => ({ ...prev, liters_per_km: event.target.value }))}
                  type="number"
                  step="0.0001"
                  className="rounded-xl border border-border px-3 py-2 text-sm"
                  placeholder="Liters per KM"
                />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Base rate + ((Average Distance - Base KM, minimum 0) x Fuel Price x Litres/KM)
              </p>
            </div>

            <div className="rounded-2xl border border-border p-4">
              <h3 className="text-sm font-semibold">Advanced</h3>
              <p className="mt-1 text-xs text-muted-foreground">Optional backend-compatible fields.</p>
              <div className="mt-4 grid gap-4">
                <input
                  value={form.kms_per_liter}
                  onChange={(event) => setForm((prev) => ({ ...prev, kms_per_liter: event.target.value }))}
                  type="number"
                  step="0.01"
                  className="rounded-xl border border-border px-3 py-2 text-sm"
                  placeholder="KMs per Liter"
                />
                <input
                  value={form.fuel_price_ref}
                  onChange={(event) => setForm((prev) => ({ ...prev, fuel_price_ref: event.target.value }))}
                  type="number"
                  step="0.01"
                  className="rounded-xl border border-border px-3 py-2 text-sm"
                  placeholder="Fuel Price Ref"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-border p-4">
            <h3 className="text-sm font-semibold">Manual Rate</h3>
            <p className="mt-1 text-xs text-muted-foreground">Manual mode stores the fixed rate in base trip cost, sets base KM to the trip distance, and lets you override liters per KM if needed.</p>
            <div className="mt-4 grid max-w-2xl gap-4 md:grid-cols-2">
              <input
                value={form.base_trip_cost}
                onChange={(event) => setForm((prev) => ({ ...prev, base_trip_cost: event.target.value }))}
                type="number"
                step="0.01"
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                placeholder="Manual Rate"
              />
              <input
                value={form.liters_per_km}
                onChange={(event) => setForm((prev) => ({ ...prev, liters_per_km: event.target.value }))}
                type="number"
                step="0.0001"
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                placeholder="Liters per KM"
              />
            </div>
          </div>
        )}

        {message ? (
          <p className="mt-4 whitespace-pre-wrap rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{message}</p>
        ) : null}

        <button
          type="submit"
          className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? "Creating..." : "Create Destination"}
        </button>
      </form>

      {mode === "system" && (previewLoading || preview) && (
        <div className="ops-card p-6">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Rate Preview</h3>
          {previewLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">Calculating...</p>
          ) : preview ? (
            <>
              <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Expected Rate</p>
                <p className="text-2xl font-bold">
                  GHS {Number(preview.expected_rate).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                </p>
                {(preview.fuel_price_used ?? preview.fuel_price) ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Fuel price used: GHS {preview.fuel_price_used ?? preview.fuel_price}/L
                  </p>
                ) : null}
              </div>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                <div className="rounded-xl border border-border bg-muted/10 p-3">
                  <p className="uppercase tracking-widest">Base Fuel Cost</p>
                  <p className="font-semibold text-foreground">
                    GHS {Number(preview.base_fuel_cost).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/10 p-3">
                  <p className="uppercase tracking-widest">Other Costs</p>
                  <p className="font-semibold text-foreground">
                    GHS {Number(preview.other_cost).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/10 p-3">
                  <p className="uppercase tracking-widest">Route Extra KM</p>
                  <p className="font-semibold text-foreground">{preview.route_extra_km}</p>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
