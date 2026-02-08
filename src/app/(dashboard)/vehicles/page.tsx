"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createVehicle,
  deleteVehicle,
  fetchVehicles,
  updateVehicle,
} from "@/lib/api/vehicles";
import type { Vehicle } from "@/types/api";

const emptyForm = {
  name: "",
  kind: "truck",
  license_plate: "",
  truck_type_capacity: "",
  vin: "",
  notes: "",
  active: true,
};

export default function VehiclesPage() {
  const queryClient = useQueryClient();
  const { data: vehicles = [], isLoading, isError } = useQuery({
    queryKey: ["vehicles"],
    queryFn: fetchVehicles,
  });

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: createVehicle,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setMessage("Vehicle created.");
      setForm(emptyForm);
    },
    onError: () => setMessage("Unable to create vehicle."),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: number; data: Partial<Vehicle> }) =>
      updateVehicle(payload.id, payload.data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setMessage("Vehicle updated.");
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: () => setMessage("Unable to update vehicle."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVehicle,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setMessage("Vehicle deleted.");
    },
    onError: () => setMessage("Delete not available on API."),
  });

  const handleEdit = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    setForm({
      name: vehicle.name,
      kind: vehicle.kind,
      license_plate: vehicle.license_plate ?? "",
      truck_type_capacity: vehicle.truck_type_capacity ?? "",
      vin: vehicle.vin ?? "",
      notes: vehicle.notes ?? "",
      active: vehicle.active,
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    const payload: Partial<Vehicle> = {
      name: form.name,
      kind: form.kind,
      license_plate: form.license_plate || undefined,
      truck_type_capacity: form.truck_type_capacity || undefined,
      vin: form.vin || undefined,
      notes: form.notes || undefined,
      active: form.active,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Vehicles
        </p>
        <h2 className="text-xl font-semibold">Fleet Overview</h2>
        <p className="text-sm text-muted-foreground">
          Add or update trucks and trailers in the fleet.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            {editingId ? "Edit Vehicle" : "Create Vehicle"}
          </h3>
          {editingId ? (
            <button
              type="button"
              className="text-xs text-muted-foreground"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              Cancel edit
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Name
            </label>
            <input
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Kind
            </label>
            <select
              value={form.kind}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, kind: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            >
              <option value="truck">truck</option>
              <option value="trailer">trailer</option>
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              License Plate
            </label>
            <input
              value={form.license_plate}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, license_plate: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Truck Type / Capacity
            </label>
            <input
              value={form.truck_type_capacity}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  truck_type_capacity: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              VIN
            </label>
            <input
              value={form.vin}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, vin: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Notes
            </label>
            <input
              value={form.notes}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, notes: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Active
            </label>
            <select
              value={form.active ? "true" : "false"}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  active: event.target.value === "true",
                }))
              }
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </div>
        </div>

        {message ? (
          <p className="mt-4 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {message}
          </p>
        ) : null}

        <div className="mt-4 flex gap-3">
          <button
            type="submit"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {editingId ? "Update Vehicle" : "Create Vehicle"}
          </button>
        </div>
      </form>

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Loading vehicles...
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">
          Unable to load vehicles. Confirm API connectivity.
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-4">
          <table className="w-full text-sm">
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
                  <td className="py-3 text-muted-foreground">
                    {vehicle.license_plate ?? "-"}
                  </td>
                  <td className="py-3 text-muted-foreground">
                    {vehicle.truck_type_capacity ?? "-"}
                  </td>
                  <td className="py-3 text-muted-foreground">
                    {vehicle.active ? "Yes" : "No"}
                  </td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-border px-3 py-1 text-xs"
                        onClick={() => handleEdit(vehicle)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-border px-3 py-1 text-xs text-rose-500"
                        onClick={() => {
                          if (
                            window.confirm(
                              "Delete is not implemented in the API. Try anyway?"
                            )
                          ) {
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
      )}
    </div>
  );
}
