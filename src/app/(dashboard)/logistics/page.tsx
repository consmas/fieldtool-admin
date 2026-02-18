"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTrips } from "@/lib/api/trips";
import { confirmPreTrip, updateFuelAllocation, updateRoadExpense, verifyPreTrip, uploadRoadExpenseReceipt } from "@/lib/api/logistics";
import { fetchPreTrip } from "@/lib/api/pretrip";
import type { Trip } from "@/types/api";
import { formatDate } from "@/lib/utils/format";

const TABS = ["pretrip", "fuel", "road"] as const;

type TabKey = (typeof TABS)[number];

export default function LogisticsPage() {
  const queryClient = useQueryClient();
  const { data: trips = [], isLoading, isError } = useQuery({
    queryKey: ["trips", "logistics"],
    queryFn: fetchTrips,
  });

  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [tab, setTab] = useState<TabKey>("pretrip");

  const [filters, setFilters] = useState({
    status: "",
    driver: "",
    vehicle: "",
    from: "",
    to: "",
  });

  const selectedTrip = useMemo(
    () => trips.find((t) => t.id === selectedTripId) ?? null,
    [trips, selectedTripId]
  );

  const drivers = useMemo(() => {
    const map = new Map<number, string>();
    trips.forEach((trip) => {
      if (trip.driver?.id) map.set(trip.driver.id, trip.driver.name ?? trip.driver.email ?? `Driver ${trip.driver.id}`);
    });
    return Array.from(map.entries());
  }, [trips]);

  const vehicles = useMemo(() => {
    const map = new Map<number, string>();
    trips.forEach((trip) => {
      if (trip.vehicle?.id) map.set(trip.vehicle.id, trip.vehicle.name ?? `Vehicle ${trip.vehicle.id}`);
    });
    return Array.from(map.entries());
  }, [trips]);

  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      if (filters.status && trip.status !== filters.status) return false;
      if (filters.driver && String(trip.driver?.id ?? "") !== filters.driver) return false;
      if (filters.vehicle && String(trip.vehicle?.id ?? "") !== filters.vehicle) return false;
      if (filters.from) {
        const date = trip.trip_date ?? trip.scheduled_pickup_at;
        if (!date || new Date(date) < new Date(filters.from)) return false;
      }
      if (filters.to) {
        const date = trip.trip_date ?? trip.scheduled_pickup_at;
        if (!date || new Date(date) > new Date(filters.to)) return false;
      }
      return true;
    });
  }, [trips, filters]);

  const { data: preTrip } = useQuery({
    queryKey: ["trip", selectedTripId, "pre_trip"],
    queryFn: () => (selectedTripId ? fetchPreTrip(String(selectedTripId)) : Promise.resolve(null)),
    enabled: Boolean(selectedTripId),
    retry: false,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const verifyMutation = useMutation({
    mutationFn: (payload: { id: number; status: "approved" | "rejected"; note?: string }) =>
      verifyPreTrip(payload.id, { status: payload.status, note: payload.note }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trips", "logistics"] }),
  });

  const confirmMutation = useMutation({
    mutationFn: (id: number) => confirmPreTrip(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trips", "logistics"] }),
  });

  const fuelMutation = useMutation({
    mutationFn: (payload: { id: number; data: Partial<Trip> }) =>
      updateFuelAllocation(payload.id, payload.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trips", "logistics"] }),
  });

  const roadMutation = useMutation({
    mutationFn: (payload: { id: number; data: Partial<Trip> }) =>
      updateRoadExpense(payload.id, payload.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trips", "logistics"] }),
  });

  const uploadReceiptMutation = useMutation({
    mutationFn: (payload: { id: number; file: File }) => uploadRoadExpenseReceipt(payload.id, payload.file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trips", "logistics"] }),
  });

  const [verifyStatus, setVerifyStatus] = useState<"approved" | "rejected">("approved");
  const [verifyNote, setVerifyNote] = useState("");

  const [fuelForm, setFuelForm] = useState({
    fuel_allocated_litres: "",
    fuel_allocation_station: "",
    fuel_allocation_payment_mode: "cash",
    fuel_allocation_reference: "",
    fuel_allocation_note: "",
  });

  const [roadForm, setRoadForm] = useState({
    road_expense_disbursed: false,
    road_expense_reference: "",
    road_expense_payment_status: "pending",
    road_expense_payment_method: "cash",
    road_expense_payment_reference: "",
    road_expense_note: "",
  });

  const loadTripForms = (trip: Trip | null) => {
    if (!trip) return;
    setFuelForm({
      fuel_allocated_litres: trip.fuel_allocated_litres ?? "",
      fuel_allocation_station: trip.fuel_allocation_station ?? "",
      fuel_allocation_payment_mode: trip.fuel_allocation_payment_mode ?? "cash",
      fuel_allocation_reference: trip.fuel_allocation_reference ?? "",
      fuel_allocation_note: trip.fuel_allocation_note ?? "",
    });
    setRoadForm({
      road_expense_disbursed: Boolean(trip.road_expense_disbursed),
      road_expense_reference: trip.road_expense_reference ?? "",
      road_expense_payment_status: trip.road_expense_payment_status ?? "pending",
      road_expense_payment_method: trip.road_expense_payment_method ?? "cash",
      road_expense_payment_reference: trip.road_expense_payment_reference ?? "",
      road_expense_note: trip.road_expense_note ?? "",
    });
  };

  const bulkVerify = async () => {
    await Promise.all(
      selectedIds.map((id) =>
        verifyMutation.mutateAsync({ id, status: verifyStatus, note: verifyNote || undefined })
      )
    );
  };

  const bulkConfirm = async () => {
    await Promise.all(selectedIds.map((id) => confirmMutation.mutateAsync(id)));
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Logistics Manager</p>
        <h2 className="text-xl font-semibold">Workflow Console</h2>
        <p className="text-sm text-muted-foreground">Verify inspections, allocate fuel, and manage road expenses.</p>
      </div>

      <div className="ops-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <input
            placeholder="Status"
            value={filters.status}
            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            className="rounded-xl border border-border px-3 py-2 text-sm"
          />
          <select
            value={filters.driver}
            onChange={(event) => setFilters((prev) => ({ ...prev, driver: event.target.value }))}
            className="rounded-xl border border-border px-3 py-2 text-sm"
          >
            <option value="">All Drivers</option>
            {drivers.map(([id, name]) => (
              <option key={id} value={String(id)}>{name}</option>
            ))}
          </select>
          <select
            value={filters.vehicle}
            onChange={(event) => setFilters((prev) => ({ ...prev, vehicle: event.target.value }))}
            className="rounded-xl border border-border px-3 py-2 text-sm"
          >
            <option value="">All Vehicles</option>
            {vehicles.map(([id, name]) => (
              <option key={id} value={String(id)}>{name}</option>
            ))}
          </select>
          <input
            type="date"
            value={filters.from}
            onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
            className="rounded-xl border border-border px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={filters.to}
            onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
            className="rounded-xl border border-border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_3fr]">
        <div className="ops-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Trips</h3>
            <span className="text-xs text-muted-foreground">{filteredTrips.length} trips</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl border border-border px-3 py-1 text-xs"
              onClick={bulkVerify}
              disabled={selectedIds.length === 0}
            >
              Bulk Verify
            </button>
            <button
              type="button"
              className="rounded-xl border border-border px-3 py-1 text-xs"
              onClick={bulkConfirm}
              disabled={selectedIds.length === 0}
            >
              Bulk Confirm
            </button>
          </div>

          {isLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading trips...</p>
          ) : isError ? (
            <p className="mt-4 text-sm text-rose-500">Unable to load trips.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {filteredTrips.map((trip) => (
                <button
                  key={trip.id}
                  type="button"
                  onClick={() => {
                    setSelectedTripId(trip.id);
                    loadTripForms(trip);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                    selectedTripId === trip.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div>
                    <p className="font-semibold">
                      {trip.waybill_number ?? trip.reference_code ?? `Trip ${trip.id}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {trip.driver?.name ?? "Unassigned"} • {trip.vehicle?.name ?? "-"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(trip.id)}
                      onChange={(event) => {
                        event.stopPropagation();
                        setSelectedIds((prev) =>
                          prev.includes(trip.id)
                            ? prev.filter((id) => id !== trip.id)
                            : [...prev, trip.id]
                        );
                      }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {trip.status ?? "-"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ops-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Workflow</p>
              <h3 className="text-lg font-semibold">
                {selectedTrip
                  ? selectedTrip.waybill_number ?? selectedTrip.reference_code ?? `Trip ${selectedTrip.id}`
                  : "Select a trip"}
              </h3>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {TABS.map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`rounded-xl border px-3 py-1 ${
                    tab === key ? "border-primary bg-primary/10" : "border-border"
                  }`}
                  onClick={() => setTab(key)}
                >
                  {key === "pretrip" ? "Pre-Trip" : key === "fuel" ? "Fuel" : "Road"}
                </button>
              ))}
            </div>
          </div>

          {!selectedTrip ? (
            <div className="mt-6 text-sm text-muted-foreground">Pick a trip to manage logistics.</div>
          ) : tab === "pretrip" ? (
            <div className="mt-6 space-y-3 text-sm">
              <div className="text-xs text-muted-foreground">
                Verification Status: {preTrip?.inspection_verification_status ?? "-"}
              </div>
              <div className="text-xs text-muted-foreground">
                Verified At: {formatDate(preTrip?.inspection_verified_at ?? undefined)}
              </div>
              <div className="text-xs text-muted-foreground">
                Confirmed: {preTrip?.inspection_confirmed ? "Yes" : "No"}
              </div>
              <select
                value={verifyStatus}
                onChange={(event) => setVerifyStatus(event.target.value as "approved" | "rejected")}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              >
                <option value="approved">approved</option>
                <option value="rejected">rejected</option>
              </select>
              <textarea
                value={verifyNote}
                onChange={(event) => setVerifyNote(event.target.value)}
                placeholder="Verification note"
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                rows={2}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                  onClick={() => verifyMutation.mutate({ id: selectedTrip.id, status: verifyStatus, note: verifyNote || undefined })}
                >
                  Verify
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-border px-3 py-2 text-xs"
                  onClick={() => confirmMutation.mutate(selectedTrip.id)}
                >
                  Confirm
                </button>
              </div>
            </div>
          ) : tab === "fuel" ? (
            <div className="mt-6 space-y-3 text-sm">
              <input
                placeholder="Fuel allocated (litres)"
                value={fuelForm.fuel_allocated_litres}
                onChange={(event) =>
                  setFuelForm((prev) => ({ ...prev, fuel_allocated_litres: event.target.value }))
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
              <input
                placeholder="Station"
                value={fuelForm.fuel_allocation_station}
                onChange={(event) =>
                  setFuelForm((prev) => ({ ...prev, fuel_allocation_station: event.target.value }))
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
              <select
                value={fuelForm.fuel_allocation_payment_mode}
                onChange={(event) =>
                  setFuelForm((prev) => ({ ...prev, fuel_allocation_payment_mode: event.target.value }))
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              >
                <option value="cash">cash</option>
                <option value="card">card</option>
                <option value="credit">credit</option>
              </select>
              <input
                placeholder="Reference"
                value={fuelForm.fuel_allocation_reference}
                onChange={(event) =>
                  setFuelForm((prev) => ({ ...prev, fuel_allocation_reference: event.target.value }))
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
              <textarea
                placeholder="Note"
                value={fuelForm.fuel_allocation_note}
                onChange={(event) =>
                  setFuelForm((prev) => ({ ...prev, fuel_allocation_note: event.target.value }))
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                rows={2}
              />
              <button
                type="button"
                className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                onClick={() => fuelMutation.mutate({ id: selectedTrip.id, data: fuelForm })}
              >
                Save Allocation
              </button>
            </div>
          ) : (
            <div className="mt-6 space-y-3 text-sm">
              <select
                value={roadForm.road_expense_disbursed ? "true" : "false"}
                onChange={(event) =>
                  setRoadForm((prev) => ({ ...prev, road_expense_disbursed: event.target.value === "true" }))
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              >
                <option value="false">Not Disbursed</option>
                <option value="true">Disbursed</option>
              </select>
              <input
                placeholder="Reference"
                value={roadForm.road_expense_reference}
                onChange={(event) =>
                  setRoadForm((prev) => ({ ...prev, road_expense_reference: event.target.value }))
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
              <select
                value={roadForm.road_expense_payment_status}
                onChange={(event) =>
                  setRoadForm((prev) => ({ ...prev, road_expense_payment_status: event.target.value }))
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              >
                <option value="pending">pending</option>
                <option value="paid">paid</option>
                <option value="rejected">rejected</option>
              </select>
              <select
                value={roadForm.road_expense_payment_method}
                onChange={(event) =>
                  setRoadForm((prev) => ({ ...prev, road_expense_payment_method: event.target.value }))
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              >
                <option value="cash">cash</option>
                <option value="momo">momo</option>
                <option value="bank">bank</option>
              </select>
              <input
                placeholder="Payment Reference"
                value={roadForm.road_expense_payment_reference}
                onChange={(event) =>
                  setRoadForm((prev) => ({ ...prev, road_expense_payment_reference: event.target.value }))
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
              <textarea
                placeholder="Note"
                value={roadForm.road_expense_note}
                onChange={(event) =>
                  setRoadForm((prev) => ({ ...prev, road_expense_note: event.target.value }))
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                rows={2}
              />
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) uploadReceiptMutation.mutate({ id: selectedTrip.id, file });
                  }}
                  className="text-xs"
                />
                <button
                  type="button"
                  className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                  onClick={() => roadMutation.mutate({ id: selectedTrip.id, data: roadForm })}
                >
                  Save Road Expense
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
