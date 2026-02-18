"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteDestination,
  fetchDestinations,
} from "@/lib/api/destinations";

export default function DestinationsPage() {
  const queryClient = useQueryClient();
  const { data: destinations = [], isLoading, isError } = useQuery({
    queryKey: ["destinations"],
    queryFn: fetchDestinations,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDestination,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["destinations"] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Destinations
          </p>
          <h2 className="text-xl font-semibold">View Destinations</h2>
          <p className="text-sm text-muted-foreground">Manage and review routing destinations.</p>
        </div>
        <Link
          href="/destinations/new"
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Create Destination
        </Link>
      </div>

      {isLoading ? (
        <div className="ops-card p-6 text-sm text-muted-foreground">
          Loading destinations...
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">
          Unable to load destinations.
        </div>
      ) : (
        <div className="ops-card p-4">
          <div className="overflow-x-auto">
          <table className="min-w-[780px] w-full text-sm">
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
        </div>
      )}
    </div>
  );
}
