"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFuelPrice } from "@/lib/api/fuel_prices";
import type { FuelPrice } from "@/types/api";

export default function CreateFuelPricePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    price_per_liter: "",
    effective_at: new Date().toISOString().slice(0, 16),
  });
  const [message, setMessage] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: createFuelPrice,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["fuel_prices"] });
      router.push("/fuel-prices");
    },
    onError: () => setMessage("Unable to add fuel price."),
  });

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Fuel Prices</p>
          <h2 className="text-lg font-semibold md:text-xl">Add Fuel Price</h2>
        </div>
        <Link href="/fuel-prices" className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">
          Back to Fuel Prices
        </Link>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setMessage(null);
          createMutation.mutate({
            price_per_liter: Number(form.price_per_liter),
            effective_at: form.effective_at || new Date().toISOString(),
          } as Partial<FuelPrice>);
        }}
        className="ops-card p-4 sm:p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <input
            placeholder="Price per liter"
            value={form.price_per_liter}
            onChange={(event) => setForm((prev) => ({ ...prev, price_per_liter: event.target.value }))}
            type="number"
            className="rounded-xl border border-border px-3 py-2 text-sm"
          />
          <input
            placeholder="Effective at"
            value={form.effective_at}
            onChange={(event) => setForm((prev) => ({ ...prev, effective_at: event.target.value }))}
            type="datetime-local"
            className="rounded-xl border border-border px-3 py-2 text-sm"
          />
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
          {createMutation.isPending ? "Adding..." : "Add Fuel Price"}
        </button>
      </form>
    </div>
  );
}
