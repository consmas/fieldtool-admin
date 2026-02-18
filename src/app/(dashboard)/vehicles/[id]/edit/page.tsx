"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchVehicle, updateVehicle } from "@/lib/api/vehicles";
import type { Vehicle } from "@/types/api";

export default function EditVehiclePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const vehicleId = Number(params?.id ?? 0);
  const [message, setMessage] = useState<string | null>(null);

  const { data: vehicle, isLoading, isError } = useQuery({
    queryKey: ["vehicles", "detail", vehicleId],
    queryFn: () => fetchVehicle(vehicleId),
    enabled: Number.isFinite(vehicleId) && vehicleId > 0,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<Vehicle>) => updateVehicle(vehicleId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      await queryClient.invalidateQueries({ queryKey: ["vehicles", "detail", vehicleId] });
      router.push("/vehicles");
    },
    onError: () => setMessage("Unable to update vehicle."),
  });

  if (isLoading) return <div className="ops-card p-6 text-sm text-muted-foreground">Loading vehicle...</div>;
  if (isError || !vehicle) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">Unable to load vehicle.</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Vehicles</p>
          <h2 className="text-lg font-semibold md:text-xl">Edit Vehicle</h2>
        </div>
        <Link href="/vehicles" className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">
          Back to Vehicles
        </Link>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setMessage(null);
          const fd = new FormData(event.currentTarget);
          updateMutation.mutate({
            name: String(fd.get("name") ?? ""),
            kind: String(fd.get("kind") ?? "truck"),
            license_plate: String(fd.get("license_plate") ?? "") || undefined,
            truck_type_capacity: String(fd.get("truck_type_capacity") ?? "") || undefined,
            vin: String(fd.get("vin") ?? "") || undefined,
            notes: String(fd.get("notes") ?? "") || undefined,
            active: String(fd.get("active") ?? "true") === "true",
          });
        }}
        className="ops-card p-4 sm:p-6"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Name</label>
            <input name="name" defaultValue={vehicle.name} className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Kind</label>
            <select name="kind" defaultValue={vehicle.kind} className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm">
              <option value="truck">truck</option>
              <option value="trailer">trailer</option>
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">License Plate</label>
            <input name="license_plate" defaultValue={vehicle.license_plate ?? ""} className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Truck Type / Capacity</label>
            <input name="truck_type_capacity" defaultValue={vehicle.truck_type_capacity ?? ""} className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">VIN</label>
            <input name="vin" defaultValue={vehicle.vin ?? ""} className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Active</label>
            <select name="active" defaultValue={vehicle.active ? "true" : "false"} className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm">
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Notes</label>
            <input name="notes" defaultValue={vehicle.notes ?? ""} className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm" />
          </div>
        </div>

        {message ? <p className="mt-4 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{message}</p> : null}

        <button type="submit" className="mt-4 w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground sm:w-auto" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Updating..." : "Update Vehicle"}
        </button>
      </form>
    </div>
  );
}
