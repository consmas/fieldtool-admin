"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Filter, Plus, Search, Trash2 } from "lucide-react";
import TripStatusBadge from "@/components/trips/TripStatusBadge";
import { deleteTrip, fetchTrips } from "@/lib/api/trips";
import type { Trip } from "@/types/api";
import { formatDate } from "@/lib/utils/format";

type FilterKey = "all" | "in_transit" | "blocked" | "delayed" | "scheduled" | "completed";

function toNumber(value?: string | number | null) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }
  return 0;
}

function getTripRef(trip: Trip) {
  return trip.waybill_number ?? trip.reference_code ?? `Trip ${trip.id}`;
}

function getRouteText(trip: Trip) {
  return `${trip.pickup_location ?? "-"} → ${trip.destination ?? trip.dropoff_location ?? "-"}`;
}

function getStatusBucket(status?: string): FilterKey {
  const normalized = (status ?? "").toLowerCase();
  if (["blocked", "cancelled"].includes(normalized)) return "blocked";
  if (["delayed"].includes(normalized)) return "delayed";
  if (["completed", "arrived", "offloaded"].includes(normalized)) return "completed";
  if (["planned", "scheduled", "assigned", "dispatched"].includes(normalized)) return "scheduled";
  if (["in_progress", "en_route", "loaded", "in_transit"].includes(normalized)) return "in_transit";
  return "all";
}

export default function TripsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const { data: trips = [], isLoading, isError } = useQuery({
    queryKey: ["trips"],
    queryFn: fetchTrips,
    refetchInterval: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTrip,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
      setSelected(new Set());
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => deleteTrip(id)));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
      setSelected(new Set());
    },
  });

  const filteredTrips = useMemo(() => {
    const term = search.trim().toLowerCase();
    return trips.filter((trip) => {
      const bucket = getStatusBucket(trip.status);
      if (filter !== "all" && bucket !== filter) return false;
      if (!term) return true;

      const haystack = [
        getTripRef(trip),
        trip.pickup_location,
        trip.destination,
        trip.dropoff_location,
        trip.driver?.name,
        trip.vehicle?.name,
        trip.truck_reg_no,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [filter, search, trips]);

  const statusCounts = useMemo(() => {
    const counts: Record<FilterKey, number> = {
      all: trips.length,
      in_transit: 0,
      blocked: 0,
      delayed: 0,
      scheduled: 0,
      completed: 0,
    };
    trips.forEach((trip) => {
      const key = getStatusBucket(trip.status);
      if (key !== "all") counts[key] += 1;
    });
    return counts;
  }, [trips]);

  const totalPages = Math.max(1, Math.ceil(filteredTrips.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageTrips = filteredTrips.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const selectedIds = Array.from(selected);
  const allOnPageSelected = pageTrips.length > 0 && pageTrips.every((trip) => selected.has(trip.id));

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        pageTrips.forEach((trip) => next.delete(trip.id));
      } else {
        pageTrips.forEach((trip) => next.add(trip.id));
      }
      return next;
    });
  };

  const filterPills: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "in_transit", label: "In Transit" },
    { key: "blocked", label: "Blocked" },
    { key: "delayed", label: "Delayed" },
    { key: "scheduled", label: "Scheduled" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="ops-section-title">Trips</p>
          <h2 className="text-xl font-semibold">Trip Monitor</h2>
          <p className="text-sm text-muted-foreground">
            Operational queue with fast filters, selection, and quick actions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/trips/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Create Trip
          </Link>
        </div>
      </div>

      <div className="ops-card p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search trip, route, driver, vehicle..."
                className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none transition focus:border-primary"
              />
            </div>
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              Live queue
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {filterPills.map((pill) => {
              const isActive = filter === pill.key;
              return (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => {
                    setFilter(pill.key);
                    setPage(1);
                  }}
                  className={[
                    "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold transition",
                    isActive
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {pill.label}
                  <span className="rounded bg-background/80 px-1.5 py-0.5 text-[10px]">
                    {statusCounts[pill.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selected.size > 0 ? (
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-primary">{selected.size} selected</span>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                if (!selectedIds.length) return;
                if (window.confirm(`Delete ${selectedIds.length} selected trip(s)?`)) {
                  bulkDeleteMutation.mutate(selectedIds);
                }
              }}
              className="inline-flex items-center gap-1 rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs text-rose-300 disabled:opacity-60"
              disabled={bulkDeleteMutation.isPending}
            >
              <Trash2 className="h-3 w-3" />
              {bulkDeleteMutation.isPending ? "Deleting..." : "Delete Selected"}
            </button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="ops-card p-6 text-sm text-muted-foreground">
          Loading trips...
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">
          Unable to load trips. Confirm API connectivity.
        </div>
      ) : (
        <>
          <div className="ops-card overflow-hidden">
            <div className="md:hidden space-y-2 p-3">
              {pageTrips.length === 0 ? (
                <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                  No trips match this filter.
                </div>
              ) : (
                pageTrips.map((trip) => (
                  <div key={trip.id} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link href={`/trips/${trip.id}`} className="font-semibold text-foreground hover:text-primary">
                          {getTripRef(trip)}
                        </Link>
                        <p className="mt-1 text-xs text-muted-foreground">{getRouteText(trip)}</p>
                      </div>
                      <TripStatusBadge status={trip.status} />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>{trip.driver?.name ?? "Unassigned"}</span>
                      <span>{trip.vehicle?.name ?? trip.truck_reg_no ?? "-"}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href={`/trips/${trip.id}`} className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
                        View
                      </Link>
                      <Link href={`/trips/${trip.id}/edit`} className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
                        Edit
                      </Link>
                      <button
                        type="button"
                        className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs text-rose-300"
                        onClick={() => {
                          if (window.confirm("Delete this trip?")) deleteMutation.mutate(trip.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-[1040px] w-full text-sm">
                <thead className="bg-muted/60 text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={toggleSelectPage}
                        className="h-3.5 w-3.5 accent-primary"
                      />
                    </th>
                    <th className="px-4 py-3">Trip</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Route</th>
                    <th className="px-4 py-3">Driver</th>
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3">Pickup</th>
                    <th className="px-4 py-3">Fuel</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageTrips.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No trips match this filter.
                      </td>
                    </tr>
                  ) : (
                    pageTrips.map((trip) => {
                      const bucket = getStatusBucket(trip.status);
                      return (
                        <tr
                          key={trip.id}
                          className={[
                            "border-t border-border/80 hover:bg-accent/30",
                            bucket === "blocked" ? "border-l-2 border-l-rose-400/80" : "",
                            bucket === "delayed" ? "border-l-2 border-l-amber-400/80" : "",
                          ].join(" ")}
                        >
                          <td className="px-4 py-3 align-top">
                            <input
                              type="checkbox"
                              checked={selected.has(trip.id)}
                              onChange={() => toggleSelect(trip.id)}
                              className="mt-0.5 h-3.5 w-3.5 accent-primary"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Link href={`/trips/${trip.id}`} className="font-semibold text-foreground hover:text-primary">
                              {getTripRef(trip)}
                            </Link>
                          </td>
                          <td className="px-4 py-3"><TripStatusBadge status={trip.status} /></td>
                          <td className="px-4 py-3 text-muted-foreground">{getRouteText(trip)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{trip.driver?.name ?? "Unassigned"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{trip.vehicle?.name ?? trip.truck_reg_no ?? "-"}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatDate(trip.trip_date ?? trip.scheduled_pickup_at ?? undefined)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {toNumber(trip.fuel_allocated_litres) > 0 ? `${toNumber(trip.fuel_allocated_litres).toFixed(0)} L` : "-"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <Link href={`/trips/${trip.id}`} className="rounded-md border border-border bg-card px-3 py-1 text-xs text-muted-foreground hover:text-foreground">
                                View
                              </Link>
                              <Link href={`/trips/${trip.id}/edit`} className="rounded-md border border-border bg-card px-3 py-1 text-xs text-muted-foreground hover:text-foreground">
                                Edit
                              </Link>
                              <button
                                type="button"
                                className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-300"
                                onClick={() => {
                                  if (window.confirm("Delete this trip?")) deleteMutation.mutate(trip.id);
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              Showing {(currentPage - 1) * pageSize + (pageTrips.length ? 1 : 0)}-
              {(currentPage - 1) * pageSize + pageTrips.length} of {filteredTrips.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="rounded border border-border px-2 py-1 disabled:opacity-40"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                Prev
              </button>
              <span className="px-2">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                className="rounded border border-border px-2 py-1 disabled:opacity-40"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
