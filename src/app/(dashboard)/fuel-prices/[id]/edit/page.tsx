"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchFuelPrice, updateFuelPrice } from "@/lib/api/fuel_prices";
import type { FuelPrice } from "@/types/api";

export default function EditFuelPricePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const fuelPriceId = Number(params?.id ?? 0);
  const [message, setMessage] = useState<string | null>(null);

  const { data: price, isLoading, isError } = useQuery({
    queryKey: ["fuel_prices", "detail", fuelPriceId],
    queryFn: () => fetchFuelPrice(fuelPriceId),
    enabled: Number.isFinite(fuelPriceId) && fuelPriceId > 0,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<FuelPrice>) => updateFuelPrice(fuelPriceId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["fuel_prices"] });
      await queryClient.invalidateQueries({ queryKey: ["fuel_prices", "detail", fuelPriceId] });
      router.push("/fuel-prices");
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
          updateMutation.mutate({
            price_per_liter: Number(fd.get("price_per_liter") ?? "0"),
            effective_at: String(fd.get("effective_at") ?? "") || new Date().toISOString(),
          } as Partial<FuelPrice>);
        }}
        className="ops-card p-4 sm:p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <input
            name="price_per_liter"
            placeholder="Price per liter"
            defaultValue={price.price_per_liter}
            type="number"
            className="rounded-xl border border-border px-3 py-2 text-sm"
          />
          <input
            name="effective_at"
            placeholder="Effective at"
            defaultValue={price.effective_at ? price.effective_at.slice(0, 16) : ""}
            type="datetime-local"
            className="rounded-xl border border-border px-3 py-2 text-sm"
          />
        </div>

        {message ? <p className="mt-4 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{message}</p> : null}

        <button type="submit" className="mt-4 w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground sm:w-auto" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Updating..." : "Update Fuel Price"}
        </button>
      </form>
    </div>
  );
}
