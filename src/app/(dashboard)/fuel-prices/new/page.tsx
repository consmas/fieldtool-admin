"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFuelPrice } from "@/lib/api/fuel_prices";
import { recalculateFuelExpenses } from "@/lib/api/expenses";
import type { FuelPrice } from "@/types/api";

export default function CreateFuelPricePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    price_per_liter: "",
    effective_at: new Date().toISOString(),
  });
  const [message, setMessage] = useState<string | null>(null);
  const [recalcMeta, setRecalcMeta] = useState<string | null>(null);
  const [needsRecalcRetry, setNeedsRecalcRetry] = useState(false);

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
      setMessage("Fuel price saved, but automatic fuel expense recalculation failed.");
    },
  });

  const createMutation = useMutation({
    mutationFn: createFuelPrice,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["fuel_prices"] });
      await recalcMutation.mutateAsync();
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
            price_per_liter: Number(String(form.price_per_liter).replace(/,/g, "").trim()) || 0,
            effective_at: String(form.effective_at).trim() || new Date().toISOString(),
          } as Partial<FuelPrice>);
        }}
        className="ops-card p-4 sm:p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <input
            placeholder="Price per liter"
            value={form.price_per_liter}
            onChange={(event) => setForm((prev) => ({ ...prev, price_per_liter: event.target.value }))}
            type="text"
            className="rounded-xl border border-border px-3 py-2 text-sm"
          />
          <input
            placeholder="Effective at (any date/time format)"
            value={form.effective_at}
            onChange={(event) => setForm((prev) => ({ ...prev, effective_at: event.target.value }))}
            type="text"
            className="rounded-xl border border-border px-3 py-2 text-sm"
          />
        </div>

        {message ? (
          <p className="mt-4 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {message}
          </p>
        ) : null}
        {recalcMeta ? (
          <p className="mt-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{recalcMeta}</p>
        ) : null}
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
          disabled={createMutation.isPending || recalcMutation.isPending}
        >
          {createMutation.isPending ? "Adding..." : recalcMutation.isPending ? "Queuing Recalculation..." : "Add Fuel Price"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/fuel-prices")}
          className="ml-0 mt-2 w-full rounded-xl border border-border px-4 py-2 text-sm font-semibold sm:ml-2 sm:mt-4 sm:w-auto"
        >
          Back to Fuel Prices
        </button>
      </form>
    </div>
  );
}
