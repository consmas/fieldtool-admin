"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteVehicle, fetchVehicles } from "@/lib/api/vehicles";

export default function VehiclesPage() {
  const queryClient = useQueryClient();
  const { data: vehicles = [], isLoading, isError } = useQuery({
    queryKey: ["vehicles"],
    queryFn: fetchVehicles,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVehicle,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Vehicles</p>
          <h2 className="text-lg font-semibold md:text-xl">Fleet Overview</h2>
          <p className="text-sm text-muted-foreground">Review trucks and trailers in the fleet.</p>
        </div>
        <Link
          href="/vehicles/new"
          className="w-full rounded-xl bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground sm:w-auto"
        >
          Create Vehicle
        </Link>
      </div>

      {isLoading ? (
        <div className="ops-card p-6 text-sm text-muted-foreground">Loading vehicles...</div>
      ) : isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">
          Unable to load vehicles. Confirm API connectivity.
        </div>
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="ops-card p-3">
                <p className="font-semibold text-foreground">{vehicle.name}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <p>Reg No: {vehicle.license_plate ?? "-"}</p>
                  <p>Capacity: {vehicle.truck_type_capacity ?? "-"}</p>
                  <p>Kind: {vehicle.kind}</p>
                  <p>Active: {vehicle.active ? "Yes" : "No"}</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link
                    href={`/vehicles/${vehicle.id}/edit`}
                    className="rounded-lg border border-border px-3 py-2 text-center text-xs"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="rounded-lg border border-border px-3 py-2 text-xs text-rose-500"
                    onClick={() => {
                      if (window.confirm("Delete is not implemented in the API. Try anyway?")) {
                        deleteMutation.mutate(vehicle.id);
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
              <table className="w-full min-w-[760px] text-sm">
                <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="py-2">Name</th>
                    <th className="py-2">Truck Reg. No.</th>
                    <th className="py-2">Truck Capacity</th>
                    <th className="py-2">Active</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="border-t border-border">
                      <td className="py-3">{vehicle.name}</td>
                      <td className="py-3 text-muted-foreground">{vehicle.license_plate ?? "-"}</td>
                      <td className="py-3 text-muted-foreground">{vehicle.truck_type_capacity ?? "-"}</td>
                      <td className="py-3 text-muted-foreground">{vehicle.active ? "Yes" : "No"}</td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <Link
                            href={`/vehicles/${vehicle.id}/edit`}
                            className="rounded-lg border border-border px-3 py-1 text-xs"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            className="rounded-lg border border-border px-3 py-1 text-xs text-rose-500"
                            onClick={() => {
                              if (window.confirm("Delete is not implemented in the API. Try anyway?")) {
                                deleteMutation.mutate(vehicle.id);
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
