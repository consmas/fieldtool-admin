"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createDestination,
  deleteDestination,
  fetchDestinations,
} from "@/lib/api/destinations";
import type { Destination } from "@/types/api";

const defaults = {
  name: "",
  average_distance_km: "",
  base_km: "100",
  base_trip_cost: "3750",
  liters_per_km: "1.0",
  active: "true",
};

export default function DestinationsPage() {
  const queryClient = useQueryClient();
  const { data: destinations = [], isLoading, isError } = useQuery({
    queryKey: ["destinations"],
    queryFn: fetchDestinations,
  });

  const [form, setForm] = useState(defaults);
  const [message, setMessage] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: createDestination,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["destinations"] });
      setMessage("Destination created.");
      setForm(defaults);
    },
    onError: () => setMessage("Unable to create destination."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDestination,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["destinations"] });
    },
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
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Destinations
        </p>
        <h2 className="text-xl font-semibold">Manage Destinations</h2>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Name
            </label>
            <input
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              required
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Average Distance (km)
            </label>
            <input
              value={form.average_distance_km}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  average_distance_km: event.target.value,
                }))
              }
              required
              type="number"
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Base KM
            </label>
            <input
              value={form.base_km}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, base_km: event.target.value }))
              }
              type="number"
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Base Trip Cost
            </label>
            <input
              value={form.base_trip_cost}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, base_trip_cost: event.target.value }))
              }
              type="number"
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Liters per KM
            </label>
            <input
              value={form.liters_per_km}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, liters_per_km: event.target.value }))
              }
              type="number"
              step="0.01"
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Active
            </label>
            <select
              value={form.active}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, active: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </div>
        </div>

        {message ? (
          <p className="mt-4 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Create Destination
        </button>
      </form>

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Loading destinations...
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">
          Unable to load destinations.
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-4">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="py-2">Name</th>
                <th className="py-2">Avg KM</th>
                <th className="py-2">Base KM</th>
                <th className="py-2">Base Cost</th>
                <th className="py-2">Active</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {destinations.map((dest) => (
                <tr key={dest.id} className="border-t border-border">
                  <td className="py-3">{dest.name}</td>
                  <td className="py-3 text-muted-foreground">
                    {dest.average_distance_km}
                  </td>
                  <td className="py-3 text-muted-foreground">{dest.base_km}</td>
                  <td className="py-3 text-muted-foreground">
                    {dest.base_trip_cost}
                  </td>
                  <td className="py-3 text-muted-foreground">
                    {dest.active ? "Yes" : "No"}
                  </td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/destinations/${dest.id}`}
                        className="rounded-lg border border-border px-3 py-1 text-xs"
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        className="rounded-lg border border-border px-3 py-1 text-xs text-rose-500"
                        onClick={() => {
                          if (window.confirm("Delete this destination?")) {
                            deleteMutation.mutate(dest.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
