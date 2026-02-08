"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import TripForm from "@/components/trips/TripForm";
import { fetchTrip, updateTrip } from "@/lib/api/trips";
import { fetchUsers } from "@/lib/api/users";
import { fetchVehicles } from "@/lib/api/vehicles";
import type { Trip } from "@/types/api";

export default function EditTripPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = Number(params?.id ?? 0);
  const queryClient = useQueryClient();

  const { data: trip, isLoading } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => fetchTrip(String(tripId)),
    enabled: Boolean(tripId),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: fetchVehicles,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: number; data: Partial<Trip> }) =>
      updateTrip(payload.id, payload.data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
      router.push("/trips");
    },
  });

  if (isLoading || !trip) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Loading trip...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Trips
        </p>
        <h2 className="text-xl font-semibold">Edit Trip</h2>
        <p className="text-sm text-muted-foreground">
          Update trip details and assignments.
        </p>
      </div>

      <TripForm
        users={users}
        vehicles={vehicles}
        initialTrip={trip}
        submitLabel={
          updateMutation.isPending ? "Updating..." : "Update Trip"
        }
        onSubmit={(payload) => updateMutation.mutate({ id: tripId, data: payload })}
        onCancel={() => router.push("/trips")}
      />
    </div>
  );
}
