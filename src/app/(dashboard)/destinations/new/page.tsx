"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createDestination } from "@/lib/api/destinations";
import type { Destination } from "@/types/api";

const defaults = {
  name: "",
  average_distance_km: "",
  base_km: "100",
  base_trip_cost: "3750",
  liters_per_km: "1.0",
  active: "true",
};

export default function NewDestinationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaults);
  const [message, setMessage] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: createDestination,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["destinations"] });
      router.push("/destinations");
    },
    onError: () => setMessage("Unable to create destination."),
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    const payload: Partial<Destination> = {
      name: form.name,
      average_distance_km: Number(form.average_distance_km),
      base_km: Number(form.base_km),
      base_trip_cost: Number(form.base_trip_cost),
      liters_per_km: Number(form.liters_per_km),
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
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Base Trip Cost</label>
            <input
              value={form.base_trip_cost}
              onChange={(event) => setForm((prev) => ({ ...prev, base_trip_cost: event.target.value }))}
              type="number"
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Liters per KM</label>
            <input
              value={form.liters_per_km}
              onChange={(event) => setForm((prev) => ({ ...prev, liters_per_km: event.target.value }))}
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
    </div>
  );
}
