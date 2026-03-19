"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  calculateDestinationRate,
  fetchDestination,
  previewDestinationRate,
  updateDestination,
} from "@/lib/api/destinations";
import type { Destination, RateCalculationResponse } from "@/types/api";
import { useState, useEffect, useRef } from "react";

export default function DestinationDetailPage() {
  const params = useParams();
  const id = Number(params?.id ?? 0);
  const queryClient = useQueryClient();

  const { data: destination, isLoading } = useQuery({
    queryKey: ["destination", id],
    queryFn: () => fetchDestination(id),
    enabled: Boolean(id),
  });

  const [form, setForm] = useState<Partial<Destination> | null>(null);
  const [calcInput, setCalcInput] = useState({
    additional_km: "0",
    period: new Date().toISOString().slice(0, 7),
  });
  const [calcResult, setCalcResult] = useState<RateCalculationResponse | null>(null);
  const [livePreview, setLivePreview] = useState<RateCalculationResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateMutation = useMutation({
    mutationFn: (payload: { id: number; data: Partial<Destination> }) =>
      updateDestination(payload.id, payload.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(["destination", id], updated);
    },
  });

  const calcMutation = useMutation({
    mutationFn: (payload: { id: number; additional_km?: number; period?: string }) =>
      calculateDestinationRate(payload.id, {
        additional_km: payload.additional_km,
        period: payload.period,
      }),
    onSuccess: (data) => setCalcResult(data),
  });

  const currentForm = form ?? destination;

  // Live preview whenever form fields change
  useEffect(() => {
    if (!currentForm) return;

    const avg = Number(currentForm.average_distance_km);
    const base = Number(currentForm.base_km);
    const kpl = Number(currentForm.kms_per_liter);
    if (avg <= 0 || base <= 0 || kpl <= 0) {
      setLivePreview(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const result = await previewDestinationRate({
          average_distance_km: avg,
          base_km: base,
          base_trip_cost: Number(currentForm.base_trip_cost ?? 0),
          kms_per_liter: kpl,
          additional_provision_pct: Number(currentForm.additional_provision_pct ?? 0),
        });
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentForm?.average_distance_km,
    currentForm?.base_km,
    currentForm?.base_trip_cost,
    currentForm?.kms_per_liter,
    currentForm?.additional_provision_pct,
  ]);

  if (isLoading || !destination) {
    return (
      <div className="ops-card p-6 text-sm text-muted-foreground">
        Loading destination...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Destination
        </p>
        <h2 className="text-xl font-semibold">{destination.name}</h2>
      </div>

      <div className="ops-card p-6">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Details
        </h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <input
            value={currentForm?.name ?? ""}
            onChange={(event) =>
              setForm((prev) => ({ ...(prev ?? destination), name: event.target.value }))
            }
            className="rounded-xl border border-border px-3 py-2 text-sm"
            placeholder="Name"
          />
          <input
            value={currentForm?.average_distance_km ?? ""}
            onChange={(event) =>
              setForm((prev) => ({
                ...(prev ?? destination),
                average_distance_km: Number(event.target.value),
              }))
            }
            type="number"
            className="rounded-xl border border-border px-3 py-2 text-sm"
            placeholder="Average Distance KM"
          />
          <input
            value={currentForm?.base_km ?? ""}
            onChange={(event) =>
              setForm((prev) => ({
                ...(prev ?? destination),
                base_km: Number(event.target.value),
              }))
            }
            type="number"
            className="rounded-xl border border-border px-3 py-2 text-sm"
            placeholder="Base KM"
          />
          <input
            value={currentForm?.base_trip_cost ?? ""}
            onChange={(event) =>
              setForm((prev) => ({
                ...(prev ?? destination),
                base_trip_cost: Number(event.target.value),
              }))
            }
            type="number"
            className="rounded-xl border border-border px-3 py-2 text-sm"
            placeholder="Other Costs / Base Trip Cost (GHS)"
          />
          <input
            value={currentForm?.kms_per_liter ?? ""}
            onChange={(event) =>
              setForm((prev) => ({
                ...(prev ?? destination),
                kms_per_liter: Number(event.target.value),
              }))
            }
            type="number"
            step="0.01"
            className="rounded-xl border border-border px-3 py-2 text-sm"
            placeholder="KMs per Litre (fuel efficiency)"
          />
          <input
            value={currentForm?.additional_provision_pct ?? ""}
            onChange={(event) =>
              setForm((prev) => ({
                ...(prev ?? destination),
                additional_provision_pct: Number(event.target.value),
              }))
            }
            type="number"
            step="0.01"
            className="rounded-xl border border-border px-3 py-2 text-sm"
            placeholder="Fuel Provision % (e.g. 0.25 = 25%)"
          />
          <select
            value={String(currentForm?.active)}
            onChange={(event) =>
              setForm((prev) => ({
                ...(prev ?? destination),
                active: event.target.value === "true",
              }))
            }
            className="rounded-xl border border-border px-3 py-2 text-sm"
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </div>
        <button
          type="button"
          className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          onClick={() => updateMutation.mutate({ id, data: currentForm! })}
        >
          Save
        </button>
      </div>

      {/* Live rate preview as form fields change */}
      {(previewLoading || livePreview) && (
        <div className="ops-card p-6">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Live Rate Preview
          </h3>
          {previewLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">Calculating...</p>
          ) : livePreview ? (
            <>
              <div className="mt-3 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Expected Rate</p>
                <p className="text-2xl font-bold">
                  GHS {Number(livePreview.expected_rate).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                </p>
                {livePreview.fuel_price_used ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Fuel price: GHS {livePreview.fuel_price_used}/L
                  </p>
                ) : null}
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3 text-xs text-muted-foreground">
                <div className="rounded-xl border border-border bg-muted/10 p-3">
                  <p className="uppercase tracking-widest">Base Fuel Cost</p>
                  <p className="font-semibold text-foreground">
                    GHS {Number(livePreview.base_fuel_cost).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="mt-1">
                    Base {livePreview.base_km} km × {((1 + livePreview.additional_provision_pct) * 100 - 100).toFixed(0)}% provision
                  </p>
                </div>
                {livePreview.route_extra_km > 0 && (
                  <div className="rounded-xl border border-border bg-muted/10 p-3">
                    <p className="uppercase tracking-widest">Extra Route Fuel</p>
                    <p className="font-semibold text-foreground">
                      GHS {Number(livePreview.extra_fuel_cost).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="mt-1">+{livePreview.route_extra_km} km beyond base</p>
                  </div>
                )}
                <div className="rounded-xl border border-border bg-muted/10 p-3">
                  <p className="uppercase tracking-widest">Other Costs</p>
                  <p className="font-semibold text-foreground">
                    GHS {Number(livePreview.other_cost).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="mt-1">Tolls, loading, etc.</p>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {destination.expected_rate != null ? (
        <div className="ops-card p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Saved Expected Rate</p>
          <p className="mt-1 text-2xl font-bold">GHS {Number(destination.expected_rate).toLocaleString("en-GH", { minimumFractionDigits: 2 })}</p>
          {destination.current_fuel_price != null ? (
            <p className="mt-1 text-xs text-muted-foreground">Based on fuel price: GHS {destination.current_fuel_price}/L</p>
          ) : null}
        </div>
      ) : null}

      <div className="ops-card p-6">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Rate Calculator
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Fuel price is automatically read from the fuel prices table for the selected period.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <input
            value={calcInput.period}
            onChange={(event) =>
              setCalcInput((prev) => ({ ...prev, period: event.target.value }))
            }
            type="month"
            className="rounded-xl border border-border px-3 py-2 text-sm"
          />
          <input
            value={calcInput.additional_km}
            onChange={(event) =>
              setCalcInput((prev) => ({ ...prev, additional_km: event.target.value }))
            }
            type="number"
            className="rounded-xl border border-border px-3 py-2 text-sm"
            placeholder="Additional KM (extra stops)"
          />
          <button
            type="button"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            onClick={() =>
              calcMutation.mutate({
                id,
                additional_km: Number(calcInput.additional_km || "0"),
                period: calcInput.period,
              })
            }
          >
            Calculate
          </button>
        </div>
        {calcResult ? (
          <div className="mt-4 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Result for {calcInput.period}</p>
            <p className="text-2xl font-bold">
              GHS {Number(calcResult.expected_rate).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
            </p>
            {calcResult.fuel_price ? (
              <p className="mt-1 text-xs text-muted-foreground">Fuel price: GHS {calcResult.fuel_price}/L</p>
            ) : null}
            <div className="mt-3 grid gap-2 md:grid-cols-3 text-xs text-muted-foreground">
              <div className="rounded-xl border border-border bg-muted/10 p-3">
                <p className="uppercase tracking-widest">Base Fuel Cost</p>
                <p className="font-semibold text-foreground">
                  GHS {Number(calcResult.base_fuel_cost).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                </p>
              </div>
              {calcResult.route_extra_km > 0 && (
                <div className="rounded-xl border border-border bg-muted/10 p-3">
                  <p className="uppercase tracking-widest">Extra Route Fuel</p>
                  <p className="font-semibold text-foreground">
                    GHS {Number(calcResult.extra_fuel_cost).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="mt-1">+{calcResult.route_extra_km} km</p>
                </div>
              )}
              <div className="rounded-xl border border-border bg-muted/10 p-3">
                <p className="uppercase tracking-widest">Other Costs</p>
                <p className="font-semibold text-foreground">
                  GHS {Number(calcResult.other_cost).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                </p>
              </div>
              {calcResult.stop_fuel_cost > 0 && (
                <div className="rounded-xl border border-border bg-muted/10 p-3">
                  <p className="uppercase tracking-widest">Stop Fuel Cost</p>
                  <p className="font-semibold text-foreground">
                    GHS {Number(calcResult.stop_fuel_cost).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="mt-1">+{calcResult.extra_km} km stops</p>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
