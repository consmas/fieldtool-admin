"use client";

import { useMemo, useState } from "react";
import type { Destination, Trip, TripStop, User, Vehicle } from "@/types/api";

const emptyForm: Partial<Trip> & {
  driver_id?: number | null;
  vehicle_id?: number | null;
  stops?: TripStop[];
} = {
  status: "assigned",
  trip_date: "",
  driver_id: null,
  driver_contact: "",
  vehicle_id: null,
  truck_reg_no: "",
  truck_type_capacity: "",
  client_name: "",
  waybill_number: "",
  destination: "",
  delivery_address: "",
  tonnage_load: "",
  customer_contact_name: "",
  customer_contact_phone: "",
  special_instructions: "",
  stops: [],
};

function toInputDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function todayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

export interface TripFormProps {
  users: User[];
  vehicles: Vehicle[];
  destinations?: Destination[];
  initialTrip?: Trip | null;
  submitLabel: string;
  onSubmit: (payload: Partial<Trip> & { stops?: TripStop[] }) => void;
  message?: string | null;
  onCancel?: () => void;
}

export default function TripForm({
  users,
  vehicles,
  destinations = [],
  initialTrip,
  submitLabel,
  onSubmit,
  message,
  onCancel,
}: TripFormProps) {
  const [form, setForm] = useState(() => {
    if (!initialTrip) return { ...emptyForm, trip_date: todayInputDate() };
    return {
      status: initialTrip.status ?? "assigned",
      trip_date: toInputDate(initialTrip.trip_date) || todayInputDate(),
      driver_id: initialTrip.driver?.id ?? initialTrip.driver_id ?? null,
      driver_contact:
        initialTrip.driver_contact ??
        initialTrip.driver?.phone_number ??
        "",
      vehicle_id: initialTrip.vehicle_id ?? initialTrip.truck_id ?? null,
      truck_reg_no:
        initialTrip.truck_reg_no ?? initialTrip.vehicle?.license_plate ?? "",
      truck_type_capacity:
        initialTrip.truck_type_capacity ??
        initialTrip.vehicle?.truck_type_capacity ??
        "",
      client_name: initialTrip.client_name ?? "",
      waybill_number:
        initialTrip.waybill_number ?? initialTrip.reference_code ?? "",
      destination: initialTrip.destination ?? initialTrip.dropoff_location ?? "",
      delivery_address: initialTrip.delivery_address ?? "",
      tonnage_load: initialTrip.tonnage_load ?? "",
      customer_contact_name: initialTrip.customer_contact_name ?? "",
      customer_contact_phone: initialTrip.customer_contact_phone ?? "",
      special_instructions: initialTrip.special_instructions ?? "",
      stops: [],
    };
  });

  const drivers = useMemo(
    () => users.filter((u) => u.role === "driver"),
    [users]
  );

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === form.vehicle_id) ?? null,
    [vehicles, form.vehicle_id]
  );

  const selectedDriver = useMemo(
    () => drivers.find((d) => d.id === form.driver_id) ?? null,
    [drivers, form.driver_id]
  );

  const selectedDestination = useMemo(
    () => destinations.find((d) => d.name === form.destination) ?? null,
    [destinations, form.destination]
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const payload: Partial<Trip> & { stops?: TripStop[] } = {
      status: form.status || undefined,
      trip_date: form.trip_date
        ? new Date(form.trip_date).toISOString()
        : undefined,
      driver_id: form.driver_id ?? undefined,
      vehicle_id: form.vehicle_id ?? undefined,
      truck_reg_no: selectedVehicle?.license_plate ?? form.truck_reg_no ?? undefined,
      driver_contact:
        (selectedDriver?.phone_number ?? form.driver_contact) || undefined,
      truck_type_capacity:
        (selectedVehicle?.truck_type_capacity ?? form.truck_type_capacity) ||
        undefined,
      client_name: form.client_name || undefined,
      waybill_number: form.waybill_number || undefined,
      reference_code: form.waybill_number || undefined,
      destination: form.destination || undefined,
      delivery_address: form.delivery_address || undefined,
      tonnage_load: form.tonnage_load || undefined,
      customer_contact_name: form.customer_contact_name || undefined,
      customer_contact_phone: form.customer_contact_phone || undefined,
      special_instructions: form.special_instructions || undefined,
      stops: form.stops?.filter((stop) => stop.destination || stop.waybill_number),
    };

    onSubmit(payload);
  };

  const updateStop = (index: number, patch: Partial<TripStop>) => {
    setForm((prev) => {
      const stops = [...(prev.stops ?? [])];
      stops[index] = { ...stops[index], ...patch };
      return { ...prev, stops };
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border bg-card p-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          {submitLabel}
        </h3>
        {onCancel ? (
          <button
            type="button"
            className="text-xs text-muted-foreground"
            onClick={onCancel}
          >
            Cancel
          </button>
        ) : null}
      </div>

      <div className="mt-4 space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Section A • General
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Trip Date
              </label>
              <input
                type="date"
                value={form.trip_date ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, trip_date: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Status
              </label>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, status: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
              >
                <option value="draft">draft</option>
                <option value="assigned">assigned</option>
                <option value="loaded">loaded</option>
                <option value="en_route">en_route</option>
                <option value="arrived">arrived</option>
                <option value="offloaded">offloaded</option>
                <option value="completed">completed</option>
                <option value="cancelled">cancelled</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Vehicle
              </label>
              <select
                value={form.vehicle_id ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    vehicle_id: event.target.value
                      ? Number(event.target.value)
                      : null,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
              >
                <option value="">Select vehicle</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} ({vehicle.license_plate ?? "N/A"})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Truck Reg. No.
              </label>
              <input
                value={selectedVehicle?.license_plate ?? form.truck_reg_no ?? ""}
                readOnly
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Driver
              </label>
              <select
                value={form.driver_id ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    driver_id: event.target.value
                      ? Number(event.target.value)
                      : null,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
              >
                <option value="">Select driver</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name ?? driver.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Driver Contact
              </label>
              <input
                value={selectedDriver?.phone_number ?? form.driver_contact ?? ""}
                readOnly
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Truck Type / Capacity
              </label>
              <input
                value={selectedVehicle?.truck_type_capacity ?? ""}
                readOnly
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground"
              />
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Section B • Delivery Details
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Client Name
              </label>
              <input
                value={form.client_name ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    client_name: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Waybill No.
              </label>
              <input
                value={form.waybill_number ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    waybill_number: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Destination
              </label>
              <select
                value={selectedDestination?.name ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    destination: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
              >
                <option value="">Select destination</option>
                {destinations.map((dest) => (
                  <option key={dest.id} value={dest.name}>
                    {dest.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Delivery Address
              </label>
              <input
                value={form.delivery_address ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    delivery_address: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Tonnage / Load
              </label>
              <input
                value={form.tonnage_load ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    tonnage_load: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Customer Contact (Name)
              </label>
              <input
                value={form.customer_contact_name ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    customer_contact_name: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Customer Contact (Phone)
              </label>
              <input
                value={form.customer_contact_phone ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    customer_contact_phone: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Special Instructions
              </label>
              <textarea
                value={form.special_instructions ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    special_instructions: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
                rows={3}
              />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Extra Stops
            </p>
            <button
              type="button"
              className="rounded-xl border border-border px-3 py-1 text-xs"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  stops: [
                    ...(prev.stops ?? []),
                    {
                      sequence: (prev.stops?.length ?? 0) + 1,
                      destination: "",
                      delivery_address: "",
                      tonnage_load: "",
                      waybill_number: "",
                      customer_contact_name: "",
                      customer_contact_phone: "",
                      special_instructions: "",
                    },
                  ],
                }))
              }
            >
              Add Stop
            </button>
          </div>
          {form.stops && form.stops.length > 0 ? (
            <div className="mt-4 space-y-4">
              {form.stops.map((stop, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-border bg-muted/20 p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Stop {index + 1}
                    </p>
                    <button
                      type="button"
                      className="text-xs text-rose-500"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          stops: prev.stops?.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <input
                      placeholder="Destination"
                      value={stop.destination ?? ""}
                      onChange={(event) =>
                        updateStop(index, { destination: event.target.value })
                      }
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                    />
                    <input
                      placeholder="Delivery Address"
                      value={stop.delivery_address ?? ""}
                      onChange={(event) =>
                        updateStop(index, {
                          delivery_address: event.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                    />
                    <input
                      placeholder="Tonnage / Load"
                      value={stop.tonnage_load ?? ""}
                      onChange={(event) =>
                        updateStop(index, { tonnage_load: event.target.value })
                      }
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                    />
                    <input
                      placeholder="Waybill Number"
                      value={stop.waybill_number ?? ""}
                      onChange={(event) =>
                        updateStop(index, { waybill_number: event.target.value })
                      }
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                    />
                    <input
                      placeholder="Customer Contact Name"
                      value={stop.customer_contact_name ?? ""}
                      onChange={(event) =>
                        updateStop(index, {
                          customer_contact_name: event.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                    />
                    <input
                      placeholder="Customer Contact Phone"
                      value={stop.customer_contact_phone ?? ""}
                      onChange={(event) =>
                        updateStop(index, {
                          customer_contact_phone: event.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                    />
                    <textarea
                      placeholder="Special Instructions"
                      value={stop.special_instructions ?? ""}
                      onChange={(event) =>
                        updateStop(index, {
                          special_instructions: event.target.value,
                        })
                      }
                      className="md:col-span-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              No extra stops added.
            </p>
          )}
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
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
