"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTrips } from "@/lib/api/trips";
import GoogleMap from "@/components/maps/GoogleMap";

export default function TrackingPage() {
  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["trips", "tracking"],
    queryFn: fetchTrips,
  });

  const activeTrips = trips.filter((trip) =>
    ["en_route", "loaded", "assigned"].includes(trip.status ?? "")
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Tracking
        </p>
        <h2 className="text-xl font-semibold">Live Tracking</h2>
        <p className="text-sm text-muted-foreground">
          Active trips with last known location.
        </p>
      </div>

      {isLoading ? (
        <div className="ops-card p-6 text-sm text-muted-foreground">
          Loading tracking data...
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {activeTrips.map((trip) => (
            <div key={trip.id} className="ops-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Waybill {trip.reference_code ?? trip.id}
                  </p>
                  <h3 className="text-lg font-semibold">{trip.pickup_location ?? "-"} → {trip.dropoff_location ?? "-"}</h3>
                </div>
                <p className="text-xs text-muted-foreground">{trip.status ?? "-"}</p>
              </div>
              <div className="mt-4">
                <GoogleMap
                  lat={trip.latest_location?.lat}
                  lng={trip.latest_location?.lng}
                />
              </div>
            </div>
          ))}
          {activeTrips.length === 0 ? (
            <div className="ops-card p-6 text-sm text-muted-foreground">
              No active trips to track.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
