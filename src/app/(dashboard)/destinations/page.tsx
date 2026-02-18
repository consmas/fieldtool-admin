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
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 md:gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Destinations
          </p>
          <h2 className="text-lg font-semibold md:text-xl">View Destinations</h2>
          <p className="text-sm text-muted-foreground">Manage and review routing destinations.</p>
        </div>
        <Link
          href="/destinations/new"
          className="w-full rounded-xl bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground sm:w-auto"
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
        <>
          <div className="space-y-2 md:hidden">
            {destinations.map((dest) => (
              <div key={dest.id} className="ops-card p-3">
                <p className="font-semibold text-foreground">{dest.name}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <p>Avg KM: {dest.average_distance_km}</p>
                  <p>Base KM: {dest.base_km}</p>
                  <p>Base Cost: {dest.base_trip_cost}</p>
                  <p>Active: {dest.active ? "Yes" : "No"}</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link
                    href={`/destinations/${dest.id}`}
                    className="rounded-lg border border-border px-3 py-2 text-center text-xs"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="rounded-lg border border-border px-3 py-2 text-xs text-rose-500"
                    onClick={() => {
                      if (window.confirm("Delete this destination?")) {
                        deleteMutation.mutate(dest.id);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="ops-card hidden p-4 md:block">
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
                        Edit
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
        </>
      )}
    </div>
  );
}
