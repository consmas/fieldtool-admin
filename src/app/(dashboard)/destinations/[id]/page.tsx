"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  calculateDestinationRate,
  fetchDestination,
  previewDestinationRate,
  updateDestination,
} from "@/lib/api/destinations";
import {
  buildDestinationPayload,
  canPreviewDestination,
  destinationToFormValues,
  getApiErrorMessage,
  inferDestinationRateMode,
  validateDestinationForm,
} from "@/lib/destinations";
import type { RateCalculationResponse } from "@/types/api";

function formatValue(value: number | string | boolean | null | undefined) {
  if (value == null || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export default function DestinationDetailPage() {
  const params = useParams();
  const id = Number(params?.id ?? 0);
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: destination, isLoading } = useQuery({
    queryKey: ["destination", id],
    queryFn: () => fetchDestination(id),
    enabled: Boolean(id),
  });

  const [form, setForm] = useState(destinationToFormValues({}));
  const [mode, setMode] = useState<"system" | "manual">("system");
  const [message, setMessage] = useState<string | null>(null);
  const [calcInput, setCalcInput] = useState({
    additional_km: "0",
    period: new Date().toISOString().slice(0, 7),
  });
  const [calcResult, setCalcResult] = useState<RateCalculationResponse | null>(null);
  const [livePreview, setLivePreview] = useState<RateCalculationResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (destination) {
      setForm(destinationToFormValues(destination));
      setMode(inferDestinationRateMode(destination));
    }
  }, [destination]);

  const payload = useMemo(() => buildDestinationPayload(form, mode), [form, mode]);

  useEffect(() => {
    if (!canPreviewDestination(form, mode)) {
      setLivePreview(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const result = await previewDestinationRate({ destination: payload });
        setLivePreview(result);
      } catch {
        setLivePreview(null);
      } finally {
        setPreviewLoading(false);
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [form, mode, payload]);

  const updateMutation = useMutation({
    mutationFn: () => updateDestination(id, payload),
    onSuccess: async (updated) => {
      setMessage(null);
      setForm(destinationToFormValues(updated));
      queryClient.setQueryData(["destination", id], updated);
      await queryClient.invalidateQueries({ queryKey: ["destinations"] });
    },
    onError: (error) => setMessage(getApiErrorMessage(error, "Unable to save destination.")),
  });

  const calcMutation = useMutation({
    mutationFn: (calcPayload: { additional_km?: number; period?: string }) =>
      calculateDestinationRate(id, calcPayload),
    onSuccess: (data) => setCalcResult(data),
  });

  if (isLoading || !destination) {
    return <div className="ops-card p-6 text-sm text-muted-foreground">Loading destination...</div>;
  }

  const savedFields = [
    ["Name", destination.name],
    ["Average Distance KM", destination.average_distance_km],
    ["Base KM", destination.base_km],
    ["Base Trip Cost", destination.base_trip_cost],
    ["Liters per KM", destination.liters_per_km],
    ["Current Fuel Price", destination.current_fuel_price],
    ["Expected Rate", destination.expected_rate],
    ["Active", destination.active],
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Destination</p>
        <h2 className="text-xl font-semibold">{destination.name}</h2>
      </div>

      <div className="ops-card p-6">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Edit Destination</h3>
        <p className="mt-1 text-xs text-muted-foreground">Choose explicit system pricing or a fixed manual rate.</p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            className="rounded-xl border border-border px-3 py-2 text-sm"
            placeholder="Name"
          />
          <input
            value={form.average_distance_km}
            onChange={(event) => setForm((prev) => ({ ...prev, average_distance_km: event.target.value }))}
            type="number"
            step="0.01"
            className="rounded-xl border border-border px-3 py-2 text-sm"
            placeholder="Average Distance KM"
          />
          <input
            value={form.additional_provision_pct}
            onChange={(event) => setForm((prev) => ({ ...prev, additional_provision_pct: event.target.value }))}
            type="number"
            step="0.01"
            className="rounded-xl border border-border px-3 py-2 text-sm"
            placeholder="Additional Provision %"
          />
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-border p-1">
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
            <select
              value={form.active}
              onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.value }))}
              className="rounded-xl border border-border px-3 py-2 text-sm"
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </div>
        </div>

        {mode === "system" ? (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border p-4">
              <h4 className="text-sm font-semibold">System Calculation</h4>
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
              <h4 className="text-sm font-semibold">Advanced</h4>
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
            <h4 className="text-sm font-semibold">Manual Rate</h4>
            <p className="mt-1 text-xs text-muted-foreground">Manual mode saves the fixed amount as base trip cost, aligns base KM with average distance, and lets you override liters per KM.</p>
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
          type="button"
          className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          onClick={() => {
            setMessage(null);
            const validationMessage = validateDestinationForm(form, mode);
            if (validationMessage) {
              setMessage(validationMessage);
              return;
            }
            updateMutation.mutate();
          }}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? "Saving..." : "Save"}
        </button>
      </div>

      {mode === "system" && (previewLoading || livePreview) && (
        <div className="ops-card p-6">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Live Rate Preview</h3>
          {previewLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">Calculating...</p>
          ) : livePreview ? (
            <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Expected Rate</p>
              <p className="text-2xl font-bold">
                GHS {Number(livePreview.expected_rate).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
              </p>
              {(livePreview.fuel_price_used ?? livePreview.fuel_price) ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Fuel price used: GHS {livePreview.fuel_price_used ?? livePreview.fuel_price}/L
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      <div className="ops-card p-6">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Saved Destination Values</h3>
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-3">
          {savedFields.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border bg-muted/10 p-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
              <p className="mt-1 font-medium text-foreground">{formatValue(value)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="ops-card p-6">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Rate Calculator</h3>
        <p className="mt-1 text-xs text-muted-foreground">Runs the backend calculation endpoint for this saved destination.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <input
            value={calcInput.period}
            onChange={(event) => setCalcInput((prev) => ({ ...prev, period: event.target.value }))}
            type="month"
            className="rounded-xl border border-border px-3 py-2 text-sm"
          />
          <input
            value={calcInput.additional_km}
            onChange={(event) => setCalcInput((prev) => ({ ...prev, additional_km: event.target.value }))}
            type="number"
            step="0.01"
            className="rounded-xl border border-border px-3 py-2 text-sm"
            placeholder="Additional KM"
          />
          <button
            type="button"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            onClick={() =>
              calcMutation.mutate({
                additional_km: calcInput.additional_km.trim() === "" ? undefined : Number(calcInput.additional_km),
                period: calcInput.period || undefined,
              })
            }
          >
            Calculate
          </button>
        </div>
        {calcResult ? (
          <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Expected Rate</p>
            <p className="text-2xl font-bold">
              GHS {Number(calcResult.expected_rate).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
            </p>
            {(calcResult.fuel_price_used ?? calcResult.fuel_price) ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Fuel price: GHS {calcResult.fuel_price_used ?? calcResult.fuel_price}/L
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
