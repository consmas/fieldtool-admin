"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  calculateDestinationRate,
  fetchDestination,
  updateDestination,
} from "@/lib/api/destinations";
import type { Destination } from "@/types/api";
import { useState } from "react";

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
    fuel_price_current: "",
    additional_km: "0",
  });
  const [calcResult, setCalcResult] = useState<any>(null);

  const updateMutation = useMutation({
    mutationFn: (payload: { id: number; data: Partial<Destination> }) =>
      updateDestination(payload.id, payload.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(["destination", id], updated);
    },
  });

  const calcMutation = useMutation({
    mutationFn: (payload: { id: number; fuel_price_current: number; additional_km?: number }) =>
      calculateDestinationRate(payload.id, {
        fuel_price_current: payload.fuel_price_current,
        additional_km: payload.additional_km,
      }),
    onSuccess: (data) => setCalcResult(data),
  });

  if (isLoading || !destination) {
    return (
      <div className="ops-card p-6 text-sm text-muted-foreground">
        Loading destination...
      </div>
    );
  }

  const currentForm = form ?? destination;

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
            value={currentForm.name ?? ""}
            onChange={(event) =>
              setForm((prev) => ({ ...(prev ?? destination), name: event.target.value }))
            }
            className="rounded-xl border border-border px-3 py-2 text-sm"
            placeholder="Name"
          />
          <input
            value={currentForm.average_distance_km ?? ""}
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
            value={currentForm.base_km ?? ""}
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
            value={currentForm.base_trip_cost ?? ""}
            onChange={(event) =>
              setForm((prev) => ({
                ...(prev ?? destination),
                base_trip_cost: Number(event.target.value),
              }))
            }
            type="number"
            className="rounded-xl border border-border px-3 py-2 text-sm"
            placeholder="Base Trip Cost"
          />
          <input
            value={currentForm.liters_per_km ?? ""}
            onChange={(event) =>
              setForm((prev) => ({
                ...(prev ?? destination),
                liters_per_km: Number(event.target.value),
              }))
            }
            type="number"
            step="0.01"
            className="rounded-xl border border-border px-3 py-2 text-sm"
            placeholder="Liters per KM"
          />
          <select
            value={String(currentForm.active)}
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
          onClick={() => updateMutation.mutate({ id, data: currentForm })}
        >
          Save
        </button>
      </div>

      <div className="ops-card p-6">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Rate Calculator
        </h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <input
            value={calcInput.fuel_price_current}
            onChange={(event) =>
              setCalcInput((prev) => ({
                ...prev,
                fuel_price_current: event.target.value,
              }))
            }
            type="number"
            className="rounded-xl border border-border px-3 py-2 text-sm"
            placeholder="Fuel price current"
          />
          <input
            value={calcInput.additional_km}
            onChange={(event) =>
              setCalcInput((prev) => ({
                ...prev,
                additional_km: event.target.value,
              }))
            }
            type="number"
            className="rounded-xl border border-border px-3 py-2 text-sm"
            placeholder="Additional KM"
          />
          <button
            type="button"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            onClick={() =>
              calcMutation.mutate({
                id,
                fuel_price_current: Number(calcInput.fuel_price_current),
                additional_km: Number(calcInput.additional_km || "0"),
              })
            }
          >
            Calculate
          </button>
        </div>
        {calcResult ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm text-muted-foreground">
            {Object.entries(calcResult).map(([key, value]) => (
              <div key={key} className="rounded-xl border border-border bg-muted/10 p-3">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{key}</p>
                <p className="font-semibold text-foreground">{String(value)}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
