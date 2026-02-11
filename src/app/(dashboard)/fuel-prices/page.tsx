"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFuelPrice, fetchFuelPrices } from "@/lib/api/fuel_prices";
import type { FuelPrice } from "@/types/api";

export default function FuelPricesPage() {
  const queryClient = useQueryClient();
  const { data: prices = [], isLoading, isError } = useQuery({
    queryKey: ["fuel_prices"],
    queryFn: fetchFuelPrices,
  });

  const [form, setForm] = useState(() => ({
    price_per_liter: "",
    effective_at: new Date().toISOString().slice(0, 16),
  }));

  const createMutation = useMutation({
    mutationFn: createFuelPrice,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["fuel_prices"] });
      setForm({
        price_per_liter: "",
        effective_at: new Date().toISOString().slice(0, 16),
      });
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    createMutation.mutate({
      price_per_liter: Number(form.price_per_liter),
      effective_at: form.effective_at || new Date().toISOString(),
    } as Partial<FuelPrice>);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Fuel Prices</p>
        <h2 className="text-xl font-semibold">Reference Table</h2>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6">
        <div className="grid gap-4 md:grid-cols-2">
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
        <button
          type="submit"
          className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Add Fuel Price
        </button>
      </form>

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading...</div>
      ) : isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">
          Unable to load fuel prices.
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-4">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="py-2">Price / Liter</th>
                <th className="py-2">Effective At</th>
              </tr>
            </thead>
            <tbody>
              {prices.map((price) => (
                <tr key={price.id} className="border-t border-border">
                  <td className="py-3">{price.price_per_liter}</td>
                  <td className="py-3 text-muted-foreground">{price.effective_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
