"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import TripForm from "@/components/trips/TripForm";
import { createTrip } from "@/lib/api/trips";
import { fetchUsers } from "@/lib/api/users";
import { fetchVehicles } from "@/lib/api/vehicles";
import type { Trip } from "@/types/api";

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

  const createMutation = useMutation({
    mutationFn: createTrip,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
      setMessage("Trip created.");
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
        submitLabel={
          createMutation.isPending ? "Creating..." : "Create Trip"
        }
        onSubmit={(payload: Partial<Trip>) => {
          setMessage(null);
          createMutation.mutate(payload);
        }}
        message={message}
      />
    </div>
  );
}
