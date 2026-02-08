"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import TripsTable from "@/components/trips/TripsTable";
import { deleteTrip, fetchTrips } from "@/lib/api/trips";

export default function TripsPage() {
  const queryClient = useQueryClient();
  const { data: trips = [], isLoading, isError } = useQuery({
    queryKey: ["trips"],
    queryFn: fetchTrips,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTrip,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Trips
          </p>
          <h2 className="text-xl font-semibold">View Trips</h2>
          <p className="text-sm text-muted-foreground">
            Review all trips and jump into details.
          </p>
        </div>
        <Link
          href="/trips/new"
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Create Trip
        </Link>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Loading trips...
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">
          Unable to load trips. Confirm API connectivity.
        </div>
      ) : (
        <TripsTable
          trips={trips}
          onDelete={(trip) => {
            if (window.confirm("Delete this trip?")) {
              deleteMutation.mutate(trip.id);
            }
          }}
        />
      )}
    </div>
  );
}
