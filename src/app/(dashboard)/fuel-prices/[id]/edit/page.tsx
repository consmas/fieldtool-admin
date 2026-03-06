"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchFuelPrice, updateFuelPrice } from "@/lib/api/fuel_prices";
import { recalculateFuelExpenses } from "@/lib/api/expenses";
import type { FuelPrice } from "@/types/api";

export default function EditFuelPricePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const fuelPriceId = Number(params?.id ?? 0);
  const [message, setMessage] = useState<string | null>(null);
  const [recalcMeta, setRecalcMeta] = useState<string | null>(null);
  const [needsRecalcRetry, setNeedsRecalcRetry] = useState(false);

  const { data: price, isLoading, isError } = useQuery({
    queryKey: ["fuel_prices", "detail", fuelPriceId],
    queryFn: () => fetchFuelPrice(fuelPriceId),
    enabled: Number.isFinite(fuelPriceId) && fuelPriceId > 0,
  });

  const recalcMutation = useMutation({
    mutationFn: () => recalculateFuelExpenses({ target_statuses: ["approved", "paid"] }),
    onSuccess: (data: unknown) => {
      const payload = (data ?? {}) as Record<string, unknown>;
      const nested = (payload.data ?? payload.job ?? payload.summary ?? {}) as Record<string, unknown>;
      const jobId = payload.job_id ?? nested.job_id ?? nested.id;
      const summary = payload.summary ?? nested.summary;
      const parts = [];
      if (jobId) parts.push(`job_id: ${String(jobId)}`);
      if (summary) parts.push(`summary: ${typeof summary === "string" ? summary : JSON.stringify(summary)}`);
      setRecalcMeta(parts.length ? parts.join(" | ") : "Queued.");
      setNeedsRecalcRetry(false);
      setMessage("Fuel expenses for approved and paid transactions are being recalculated for this fuel price period.");
    },
    onError: () => {
      setNeedsRecalcRetry(true);
      setMessage("Fuel price updated, but automatic fuel expense recalculation failed.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<FuelPrice>) => updateFuelPrice(fuelPriceId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["fuel_prices"] });
      await queryClient.invalidateQueries({ queryKey: ["fuel_prices", "detail", fuelPriceId] });
      await recalcMutation.mutateAsync();
    },
    onError: () => setMessage("Unable to update fuel price."),
  });

  if (isLoading) return <div className="ops-card p-6 text-sm text-muted-foreground">Loading fuel price...</div>;
  if (isError || !price) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">Unable to load fuel price.</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Fuel Prices</p>
          <h2 className="text-lg font-semibold md:text-xl">Edit Fuel Price</h2>
        </div>
        <Link href="/fuel-prices" className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">
          Back to Fuel Prices
        </Link>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setMessage(null);
          const fd = new FormData(event.currentTarget);
          const rawPrice = String(fd.get("price_per_liter") ?? "").replace(/,/g, "").trim();
          const parsedPrice = Number(rawPrice);
          updateMutation.mutate({
            price_per_liter: Number.isFinite(parsedPrice) ? parsedPrice : 0,
            effective_at: String(fd.get("effective_at") ?? "").trim() || new Date().toISOString(),
          } as Partial<FuelPrice>);
        }}
        className="ops-card p-4 sm:p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <input
            name="price_per_liter"
            placeholder="Price per liter"
            defaultValue={price.price_per_liter}
            type="text"
            className="rounded-xl border border-border px-3 py-2 text-sm"
          />
          <input
            name="effective_at"
            placeholder="Effective at (any date/time format)"
            defaultValue={price.effective_at ?? ""}
            type="text"
            className="rounded-xl border border-border px-3 py-2 text-sm"
          />
        </div>

        {message ? <p className="mt-4 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{message}</p> : null}
        {recalcMeta ? <p className="mt-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{recalcMeta}</p> : null}
        {needsRecalcRetry ? (
          <button
            type="button"
            onClick={() => recalcMutation.mutate()}
            disabled={recalcMutation.isPending}
            className="mt-2 rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground"
          >
            {recalcMutation.isPending ? "Retrying..." : "Retry Recalculation"}
          </button>
        ) : null}

        <button
          type="submit"
          className="mt-4 w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground sm:w-auto"
          disabled={updateMutation.isPending || recalcMutation.isPending}
        >
          {updateMutation.isPending ? "Updating..." : recalcMutation.isPending ? "Queuing Recalculation..." : "Update Fuel Price"}
        </button>
      </form>
    </div>
  );
}
