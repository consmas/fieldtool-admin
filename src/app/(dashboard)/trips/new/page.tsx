"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import TripForm from "@/components/trips/TripForm";
import { createTrip } from "@/lib/api/trips";
import { createTripStop } from "@/lib/api/stops";
import { fetchUsers } from "@/lib/api/users";
import { fetchVehicles } from "@/lib/api/vehicles";
import { fetchDestinations } from "@/lib/api/destinations";
import type { Trip, TripStop } from "@/types/api";

export default function NewTripPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: fetchVehicles,
  });
  const { data: destinations = [] } = useQuery({
    queryKey: ["destinations"],
    queryFn: fetchDestinations,
  });

  const createMutation = useMutation({
    mutationFn: createTrip,
    onSuccess: async (trip) => {
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
      setMessage("Trip created.");
      return trip;
    },
    onError: () => setMessage("Unable to create trip."),
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Trips
        </p>
        <h2 className="text-xl font-semibold">New Trip</h2>
        <p className="text-sm text-muted-foreground">
          Create a trip with Section A & B fields.
        </p>
      </div>

      <TripForm
        users={users}
        vehicles={vehicles}
        destinations={destinations}
        submitLabel={
          createMutation.isPending ? "Creating..." : "Create Trip"
        }
        onSubmit={async (payload: Partial<Trip> & { stops?: TripStop[] }) => {
          setMessage(null);
          const { stops, ...tripPayload } = payload;
          const created = await createMutation.mutateAsync(tripPayload);
          if (stops && stops.length > 0 && created?.id) {
            await Promise.all(
              stops.map((stop, index) =>
                createTripStop(created.id, { ...stop, sequence: index + 1 })
              )
            );
          }
        }}
        message={message}
      />
    </div>
  );
}
