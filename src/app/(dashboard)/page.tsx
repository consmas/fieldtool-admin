"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import TripsTable from "@/components/trips/TripsTable";
import { fetchTrips } from "@/lib/api/trips";

function isSameMonth(date: Date, now: Date) {
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth()
  );
}

export default function DashboardPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["trips"],
    queryFn: fetchTrips,
  });

  const metrics = useMemo(() => {
    const now = new Date();
    let scheduledThisMonth = 0;
    let completedThisMonth = 0;
    let totalDistanceKm = 0;

    data.forEach((trip) => {
      if (trip.scheduled_pickup_at) {
        const scheduled = new Date(trip.scheduled_pickup_at);
        if (!Number.isNaN(scheduled.getTime()) && isSameMonth(scheduled, now)) {
          scheduledThisMonth += 1;
        }
      }

      if (trip.completed_at) {
        const completed = new Date(trip.completed_at);
        if (!Number.isNaN(completed.getTime()) && isSameMonth(completed, now)) {
          completedThisMonth += 1;
        }
      }

      if (
        trip.start_odometer_km !== null &&
        trip.start_odometer_km !== undefined &&
        trip.end_odometer_km !== null &&
        trip.end_odometer_km !== undefined
      ) {
        const delta = trip.end_odometer_km - trip.start_odometer_km;
        if (Number.isFinite(delta) && delta > 0) {
          totalDistanceKm += delta;
        }
      }
    });

    return {
      scheduledThisMonth,
      completedThisMonth,
      totalDistanceKm,
      activeTrips: data.filter((t) =>
        ["assigned", "loaded", "en_route", "arrived", "offloaded"].includes(
          t.status ?? ""
        )
      ).length,
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          {
            label: "Trips Scheduled (Month)",
            value: metrics.scheduledThisMonth,
          },
          {
            label: "Trips Completed (Month)",
            value: metrics.completedThisMonth,
          },
          {
            label: "Total Distance (km)",
            value: metrics.totalDistanceKm.toFixed(1),
          },
          {
            label: "Active Trips",
            value: metrics.activeTrips,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {isLoading ? "--" : item.value}
            </p>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Recent Trips
            </p>
            <h2 className="text-lg font-semibold">Operations Snapshot</h2>
          </div>
        </div>
        <TripsTable trips={data.slice(0, 6)} />
      </div>
    </div>
  );
}
