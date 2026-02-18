"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTrip } from "@/lib/api/trips";
import TripHeader from "@/components/trips/TripHeader";
import TripTimeline from "@/components/trips/TripTimeline";
import OdometerCard from "@/components/trips/OdometerCard";
import GoogleMap from "@/components/maps/GoogleMap";
import { fetchPreTrip } from "@/lib/api/pretrip";
import { formatDate } from "@/lib/utils/format";
import {
  confirmPreTrip,
  updateFuelAllocation,
  updateRoadExpense,
  uploadRoadExpenseReceipt,
  verifyPreTrip,
} from "@/lib/api/logistics";
import { useEffect, useMemo, useState } from "react";

type ChecklistStatus = "pass" | "fail" | "na";
type ChecklistFilter = "all" | "failed" | "blockers";

function normalizeChecklistStatus(value: unknown): ChecklistStatus | null {
  if (value === true) return "pass";
  if (value === false) return "fail";
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase();
  if (normalized === "pass" || normalized === "ok" || normalized === "yes") return "pass";
  if (normalized === "fail" || normalized === "failed" || normalized === "no") return "fail";
  if (normalized === "na" || normalized === "n/a" || normalized === "not_applicable") return "na";
  return null;
}

export default function TripDetailPage() {
  const params = useParams();
  const tripId = String(params?.id ?? "");
  const queryClient = useQueryClient();

  const {
    data: trip,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => fetchTrip(tripId),
    enabled: Boolean(tripId),
    refetchInterval: 15_000,
  });

  const { data: preTrip } = useQuery({
    queryKey: ["trip", tripId, "pre_trip"],
    queryFn: () => fetchPreTrip(tripId),
    enabled: Boolean(tripId),
    // This endpoint returns 404 until a pre-trip exists; do not poll it in the background.
    refetchInterval: false,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const [verificationStatus, setVerificationStatus] = useState<
    "approved" | "rejected"
  >("approved");
  const [verificationNote, setVerificationNote] = useState("");
  const [checklistFilter, setChecklistFilter] = useState<ChecklistFilter>("all");
  const [fuelAllocation, setFuelAllocation] = useState({
    fuel_allocated_litres: "",
    fuel_allocation_station: "",
    fuel_allocation_payment_mode: "cash",
    fuel_allocation_reference: "",
    fuel_allocation_note: "",
  });
  const [roadExpense, setRoadExpense] = useState({
    road_expense_disbursed: false,
    road_expense_reference: "",
    road_expense_payment_status: "pending",
    road_expense_payment_method: "cash",
    road_expense_payment_reference: "",
    road_expense_note: "",
  });

  useEffect(() => {
    if (!trip) return;
    setFuelAllocation({
      fuel_allocated_litres: trip.fuel_allocated_litres ?? "",
      fuel_allocation_station: trip.fuel_allocation_station ?? "",
      fuel_allocation_payment_mode: trip.fuel_allocation_payment_mode ?? "cash",
      fuel_allocation_reference: trip.fuel_allocation_reference ?? "",
      fuel_allocation_note: trip.fuel_allocation_note ?? "",
    });
    setRoadExpense({
      road_expense_disbursed: Boolean(trip.road_expense_disbursed),
      road_expense_reference: trip.road_expense_reference ?? "",
      road_expense_payment_status: trip.road_expense_payment_status ?? "pending",
      road_expense_payment_method: trip.road_expense_payment_method ?? "cash",
      road_expense_payment_reference: trip.road_expense_payment_reference ?? "",
      road_expense_note: trip.road_expense_note ?? "",
    });
  }, [trip]);

  const verifyMutation = useMutation({
    mutationFn: () =>
      verifyPreTrip(Number(tripId), {
        status: verificationStatus,
        note: verificationNote || undefined,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["trip", tripId, "pre_trip"] }),
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirmPreTrip(Number(tripId)),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["trip", tripId, "pre_trip"] }),
  });

  const fuelMutation = useMutation({
    mutationFn: () => updateFuelAllocation(Number(tripId), fuelAllocation),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trip", tripId] }),
  });

  const roadExpenseMutation = useMutation({
    mutationFn: () => updateRoadExpense(Number(tripId), roadExpense),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trip", tripId] }),
  });

  const uploadReceiptMutation = useMutation({
    mutationFn: (file: File) => uploadRoadExpenseReceipt(Number(tripId), file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trip", tripId] }),
  });

  const checklistRows = useMemo(() => {
    const template = preTrip?.core_checklist_template ?? [];
    const values = preTrip?.core_checklist ?? {};

    return template.map((item) => {
      const rawValue = values[item.code];
      const objectValue =
        rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)
          ? (rawValue as { status?: string | null; note?: string | null })
          : null;
      const status = normalizeChecklistStatus(objectValue?.status ?? rawValue);
      const note = objectValue?.note?.trim() || "";
      const severity = item.severity_on_fail === "blocker" ? "blocker" : "warning";

      return {
        ...item,
        status,
        note,
        isFailure: status === "fail",
        isBlockerFailure: status === "fail" && severity === "blocker",
      };
    });
  }, [preTrip?.core_checklist, preTrip?.core_checklist_template]);

  const filteredChecklistRows = useMemo(() => {
    if (checklistFilter === "failed") {
      return checklistRows.filter((row) => row.isFailure);
    }
    if (checklistFilter === "blockers") {
      return checklistRows.filter((row) => row.isBlockerFailure);
    }
    return checklistRows;
  }, [checklistRows, checklistFilter]);

  const checklistGrouped = useMemo(() => {
    const grouped = new Map<string, typeof filteredChecklistRows>();
    filteredChecklistRows.forEach((row) => {
      const section = row.section || "General";
      const existing = grouped.get(section) ?? [];
      grouped.set(section, [...existing, row]);
    });
    return Array.from(grouped.entries());
  }, [filteredChecklistRows]);

  const checklistSummary = useMemo(() => {
    const totalFail = checklistRows.filter((row) => row.isFailure).length;
    const blockerFailCount = checklistRows.filter((row) => row.isBlockerFailure).length;
    return { totalFail, blockerFailCount };
  }, [checklistRows]);

  const exportChecklistCsv = () => {
    if (checklistRows.length === 0) return;
    const header = ["section", "code", "label", "status", "severity_on_fail", "note"];
    const lines = checklistRows.map((row) =>
      [
        row.section ?? "",
        row.code ?? "",
        row.label ?? "",
        row.status ?? "",
        row.severity_on_fail ?? "",
        row.note ?? "",
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `trip-${tripId}-inspection-checklist.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Loading trip details...
      </div>
    );
  }

  if (isError || !trip) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">
        Trip not found. Verify the trip ID or API response.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TripHeader trip={trip} />
      <div>
        <Link
          href={`/trip-chats/${trip.id}`}
          className="inline-flex rounded-xl border border-border px-3 py-2 text-xs"
        >
          Chat with Dispatcher
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Live Tracking
              </h3>
              <p className="text-xs text-muted-foreground">Auto-refresh 15s</p>
            </div>
            <div className="mt-4">
              <GoogleMap
                lat={trip.latest_location?.lat}
                lng={trip.latest_location?.lng}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Latest ping at {trip.latest_location?.recorded_at ?? "-"} • Speed{" "}
                {trip.latest_location?.speed ?? "-"} • Heading{" "}
                {trip.latest_location?.heading ?? "-"}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Trip Information
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Waybill Number</p>
                <p className="font-semibold">
                  {trip.waybill_number ?? trip.reference_code ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Client Name</p>
                <p className="font-semibold">{trip.client_name ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Destination</p>
                <p className="font-semibold">
                  {trip.destination ?? trip.dropoff_location ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Delivery Address</p>
                <p className="font-semibold">{trip.delivery_address ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Delivery Coordinates</p>
                <p className="font-semibold">
                  {trip.delivery_lat !== null &&
                  trip.delivery_lat !== undefined &&
                  trip.delivery_lng !== null &&
                  trip.delivery_lng !== undefined
                    ? `${Number(trip.delivery_lat).toFixed(6)}, ${Number(
                        trip.delivery_lng
                      ).toFixed(6)}`
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Map</p>
                {trip.delivery_map_url ||
                (trip.delivery_lat !== null &&
                  trip.delivery_lat !== undefined &&
                  trip.delivery_lng !== null &&
                  trip.delivery_lng !== undefined) ? (
                  <a
                    href={
                      trip.delivery_map_url ||
                      `https://www.google.com/maps?q=${trip.delivery_lat},${trip.delivery_lng}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-lg border border-border px-2 py-1 text-xs"
                  >
                    Open in Maps
                  </a>
                ) : (
                  <p className="font-semibold">-</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tonnage Load</p>
                <p className="font-semibold">{trip.tonnage_load ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pickup Notes</p>
                <p className="font-semibold">{trip.pickup_notes ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dropoff Notes</p>
                <p className="font-semibold">{trip.dropoff_notes ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Material</p>
                <p className="font-semibold">{trip.material_description ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Scheduled Pickup</p>
                <p className="font-semibold">
                  {formatDate(trip.scheduled_pickup_at ?? undefined)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Scheduled Dropoff</p>
                <p className="font-semibold">
                  {formatDate(trip.scheduled_dropoff_at ?? undefined)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Driver Contact</p>
                <p className="font-semibold">{trip.driver_contact ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Customer Contact</p>
                <p className="font-semibold">
                  {trip.customer_contact_name ?? "-"}{" "}
                  {trip.customer_contact_phone
                    ? `• ${trip.customer_contact_phone}`
                    : ""}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Special Instructions</p>
                <p className="font-semibold">
                  {trip.special_instructions ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Truck Type/Capacity</p>
                <p className="font-semibold">
                  {trip.truck_type_capacity ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Road Expense</p>
                <p className="font-semibold">
                  {trip.road_expense_disbursed ? "Disbursed" : "Not Disbursed"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expense Reference</p>
                <p className="font-semibold">
                  {trip.road_expense_reference ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dispatcher ID</p>
                <p className="font-semibold">{trip.dispatcher_id ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Truck</p>
                <p className="font-semibold">
                  {trip.vehicle?.name ?? "-"}{" "}
                  {trip.vehicle?.license_plate
                    ? `• ${trip.vehicle.license_plate}`
                    : ""}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Start Odometer</p>
                <p className="font-semibold">
                  {trip.start_odometer_km ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">End Odometer</p>
                <p className="font-semibold">{trip.end_odometer_km ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Start Odometer Note
                </p>
                <p className="font-semibold">{trip.start_odometer_note ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">End Odometer Note</p>
                <p className="font-semibold">{trip.end_odometer_note ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Start Photo Attached
                </p>
                <p className="font-semibold">
                  {trip.start_odometer_photo_attached ? "Yes" : "No"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  End Photo Attached
                </p>
                <p className="font-semibold">
                  {trip.end_odometer_photo_attached ? "Yes" : "No"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Start Captured At
                </p>
                <p className="font-semibold">
                  {formatDate(trip.start_odometer_captured_at ?? undefined)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">End Captured At</p>
                <p className="font-semibold">
                  {formatDate(trip.end_odometer_captured_at ?? undefined)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Start GPS</p>
                <p className="font-semibold">
                  {trip.start_odometer_lat ?? "-"},{" "}
                  {trip.start_odometer_lng ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">End GPS</p>
                <p className="font-semibold">
                  {trip.end_odometer_lat ?? "-"}, {trip.end_odometer_lng ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Completed At</p>
                <p className="font-semibold">
                  {formatDate(trip.completed_at ?? undefined)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cancelled At</p>
                <p className="font-semibold">
                  {formatDate(trip.cancelled_at ?? undefined)}
                </p>
              </div>
            </div>
          </div>

          <TripTimeline events={trip.events} />
        </div>

        <div className="space-y-6">
          <OdometerCard
            start={trip.start_odometer_km ?? undefined}
            end={trip.end_odometer_km ?? undefined}
          />
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Status Flow
            </h3>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {[
                "draft",
                "assigned",
                "loaded",
                "en_route",
                "arrived",
                "offloaded",
                "completed",
                "cancelled",
              ].map((status) => (
                <span
                  key={status}
                  className={`rounded-full border px-3 py-1 ${
                    trip.status === status
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {status.replace("_", " ")}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Last status change: {formatDate(trip.status_changed_at ?? undefined)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Odometer Photos
            </h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                {
                  label: "Start Odometer",
                  url: trip.start_odometer_photo_url ?? null,
                },
                {
                  label: "End Odometer",
                  url: trip.end_odometer_photo_url ?? null,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-border bg-muted/30 p-3"
                >
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  {item.url ? (
                    <img
                      src={item.url}
                      alt={item.label}
                      className="mt-2 h-40 w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="mt-2 flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Pre-Trip Inspection
          </h3>
          {preTrip ? (
            <div className="mt-4 space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Waybill Number</p>
                  <p className="font-semibold">{preTrip.waybill_number ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fuel Level</p>
                  <p className="font-semibold">{preTrip.fuel_level ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Assistant</p>
                  <p className="font-semibold">
                    {preTrip.assistant_name ?? "-"}{" "}
                    {preTrip.assistant_phone ? `• ${preTrip.assistant_phone}` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Captured</p>
                  <p className="font-semibold">
                    {formatDate(preTrip.odometer_captured_at ?? undefined)}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Brakes", preTrip.brakes],
                  ["Tyres", preTrip.tyres],
                  ["Lights", preTrip.lights],
                  ["Mirrors", preTrip.mirrors],
                  ["Horn", preTrip.horn],
                  ["Fuel", preTrip.fuel_sufficient],
                  ["Load Area", preTrip.load_area_ready],
                  ["Load Secured", preTrip.load_secured],
                  ["Accepted", preTrip.accepted],
                ].map(([label, value]) => (
                  <div key={label as string} className="rounded-xl border border-border px-3 py-2 text-xs">
                    <p className="text-muted-foreground">{label}</p>
                    <p className="font-semibold">
                      {value === null || value === undefined ? "-" : value ? "Yes" : "No"}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Load Status</p>
                  <p className="font-semibold">{preTrip.load_status ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Load Note</p>
                  <p className="font-semibold">{preTrip.load_note ?? "-"}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Odometer Photo", url: preTrip.odometer_photo_url },
                  { label: "Load Photo", url: preTrip.load_photo_url },
                  { label: "Waybill Photo", url: preTrip.waybill_photo_url },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-border bg-muted/30 p-3"
                  >
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    {item.url ? (
                      <img
                        src={item.url}
                        alt={item.label}
                        className="mt-2 h-32 w-full rounded-lg object-cover"
                      />
                    ) : (
                      <div className="mt-2 flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Inspection Checklist
                  </h4>
                  {checklistRows.length > 0 ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-border px-2 py-1 text-[11px]"
                        onClick={() => window.print()}
                      >
                        Print
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-border px-2 py-1 text-[11px]"
                        onClick={exportChecklistCsv}
                      >
                        Export CSV
                      </button>
                    </div>
                  ) : null}
                </div>

                {checklistRows.length === 0 ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Legacy pre-trip (no structured checklist submitted).
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-rose-300 bg-rose-500/10 px-3 py-2 text-xs">
                        <p className="text-muted-foreground">Total Failed Checks</p>
                        <p className="text-sm font-semibold text-rose-400">
                          {checklistSummary.totalFail}
                        </p>
                      </div>
                      <div className="rounded-lg border border-rose-400 bg-rose-600/20 px-3 py-2 text-xs">
                        <p className="text-muted-foreground">Blocker Failures</p>
                        <p className="text-sm font-semibold text-rose-300">
                          {checklistSummary.blockerFailCount}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: "all", label: "All" },
                        { key: "failed", label: "Failed Only" },
                        { key: "blockers", label: "Blockers Only" },
                      ].map((filter) => (
                        <button
                          key={filter.key}
                          type="button"
                          onClick={() => setChecklistFilter(filter.key as ChecklistFilter)}
                          className={`rounded-lg border px-3 py-1 text-xs ${
                            checklistFilter === filter.key
                              ? "border-primary bg-primary/20 text-primary"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>

                    {checklistGrouped.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No checklist items for selected filter.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {checklistGrouped.map(([section, rows]) => (
                          <div key={section} className="rounded-lg border border-border p-3">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                              {section}
                            </p>
                            <div className="mt-2 space-y-2">
                              {rows.map((row) => {
                                const badgeClass =
                                  row.status === "fail" && row.severity_on_fail === "blocker"
                                    ? "border-rose-400 bg-rose-500/20 text-rose-300"
                                    : row.status === "fail"
                                    ? "border-amber-400 bg-amber-500/20 text-amber-300"
                                    : row.status === "pass"
                                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                                    : "border-border bg-muted/30 text-muted-foreground";

                                return (
                                  <div
                                    key={row.code}
                                    className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border bg-background/30 px-3 py-2"
                                  >
                                    <div>
                                      <p className="text-sm font-medium">{row.label}</p>
                                      <p className="text-[11px] text-muted-foreground">
                                        {row.code}
                                        {row.severity_on_fail
                                          ? ` • ${row.severity_on_fail}`
                                          : ""}
                                      </p>
                                      {row.note ? (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                          Note: {row.note}
                                        </p>
                                      ) : null}
                                    </div>
                                    <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${badgeClass}`}>
                                      {(row.status ?? "na").toUpperCase()}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              No pre-trip inspection captured yet.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Signatures & Proof
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { label: "Client Rep Signature", url: trip.client_rep_signature_url },
              {
                label: "Proof of Fuelling",
                url:
                  trip.proof_of_fuelling_url ??
                  trip.proof_of_fueling_url ??
                  trip.proofOfFuellingUrl ??
                  null,
              },
              { label: "Inspector Signature", url: preTrip?.inspector_signature_url ?? trip.inspector_signature_url },
              { label: "Security Signature", url: trip.security_signature_url },
              { label: "Driver Signature", url: trip.driver_signature_url },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-border bg-muted/30 p-3"
              >
                <p className="text-xs text-muted-foreground">{item.label}</p>
                {item.url ? (
                  <img
                    src={item.url}
                    alt={item.label}
                    className="mt-2 h-32 w-full rounded-lg object-cover"
                  />
                ) : (
                  <div className="mt-2 flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                    No image
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Evidence
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(trip.evidences ?? trip.evidence ?? []).length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No evidence uploaded yet.
            </div>
          ) : (
            (trip.evidences ?? trip.evidence ?? []).map((item, index) => (
              <div
                key={item.id ?? index}
                className="rounded-xl border border-border bg-muted/30 p-3"
              >
                <p className="text-xs text-muted-foreground">
                  {item.kind ?? "Evidence"}
                </p>
                {item.photo_url ? (
                  <img
                    src={item.photo_url}
                    alt={item.kind ?? "Evidence"}
                    className="mt-2 h-36 w-full rounded-lg object-cover"
                  />
                ) : (
                  <div className="mt-2 flex h-36 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                    No image
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Logistics Manager
        </h3>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-muted/10 p-4">
            <h4 className="text-xs uppercase tracking-widest text-muted-foreground">
              Pre-Trip Verification
            </h4>
            <div className="mt-3 space-y-2 text-xs text-muted-foreground">
              <div>Status: {preTrip?.inspection_verification_status ?? "-"}</div>
              <div>Verified By: {preTrip?.inspection_verified_by_id ?? "-"}</div>
              <div>Verified At: {formatDate(preTrip?.inspection_verified_at ?? undefined)}</div>
              <div>Note: {preTrip?.inspection_verification_note ?? "-"}</div>
              <div>Confirmed: {preTrip?.inspection_confirmed ? "Yes" : "No"}</div>
              <div>Confirmed By: {preTrip?.inspection_confirmed_by_id ?? "-"}</div>
              <div>Confirmed At: {formatDate(preTrip?.inspection_confirmed_at ?? undefined)}</div>
            </div>
            <div className="mt-3 space-y-2">
              <select
                value={verificationStatus}
                onChange={(event) =>
                  setVerificationStatus(event.target.value as "approved" | "rejected")
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              >
                <option value="approved">approved</option>
                <option value="rejected">rejected</option>
              </select>
              <textarea
                value={verificationNote}
                onChange={(event) => setVerificationNote(event.target.value)}
                placeholder="Verification note"
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                  onClick={() => verifyMutation.mutate()}
                >
                  Verify
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-border px-3 py-2 text-xs"
                  onClick={() => confirmMutation.mutate()}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-muted/10 p-4">
            <h4 className="text-xs uppercase tracking-widest text-muted-foreground">
              Fuel Allocation (Planned)
            </h4>
            <div className="mt-3 space-y-2">
              <input
                placeholder="Fuel allocated (litres)"
                value={fuelAllocation.fuel_allocated_litres}
                onChange={(event) =>
                  setFuelAllocation((prev) => ({
                    ...prev,
                    fuel_allocated_litres: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
              <input
                placeholder="Station"
                value={fuelAllocation.fuel_allocation_station}
                onChange={(event) =>
                  setFuelAllocation((prev) => ({
                    ...prev,
                    fuel_allocation_station: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
              <select
                value={fuelAllocation.fuel_allocation_payment_mode}
                onChange={(event) =>
                  setFuelAllocation((prev) => ({
                    ...prev,
                    fuel_allocation_payment_mode: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              >
                <option value="cash">cash</option>
                <option value="card">card</option>
                <option value="credit">credit</option>
              </select>
              <input
                placeholder="Reference"
                value={fuelAllocation.fuel_allocation_reference}
                onChange={(event) =>
                  setFuelAllocation((prev) => ({
                    ...prev,
                    fuel_allocation_reference: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
              <textarea
                placeholder="Note"
                value={fuelAllocation.fuel_allocation_note}
                onChange={(event) =>
                  setFuelAllocation((prev) => ({
                    ...prev,
                    fuel_allocation_note: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                rows={2}
              />
              <button
                type="button"
                className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                onClick={() => fuelMutation.mutate()}
              >
                Save Allocation
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-muted/10 p-4">
            <h4 className="text-xs uppercase tracking-widest text-muted-foreground">
              Road Expense Payment
            </h4>
            <div className="mt-3 space-y-2">
              <select
                value={roadExpense.road_expense_disbursed ? "true" : "false"}
                onChange={(event) =>
                  setRoadExpense((prev) => ({
                    ...prev,
                    road_expense_disbursed: event.target.value === "true",
                  }))
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              >
                <option value="false">Not Disbursed</option>
                <option value="true">Disbursed</option>
              </select>
              <input
                placeholder="Reference"
                value={roadExpense.road_expense_reference}
                onChange={(event) =>
                  setRoadExpense((prev) => ({
                    ...prev,
                    road_expense_reference: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
              <select
                value={roadExpense.road_expense_payment_status}
                onChange={(event) =>
                  setRoadExpense((prev) => ({
                    ...prev,
                    road_expense_payment_status: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              >
                <option value="pending">pending</option>
                <option value="paid">paid</option>
                <option value="rejected">rejected</option>
              </select>
              <select
                value={roadExpense.road_expense_payment_method}
                onChange={(event) =>
                  setRoadExpense((prev) => ({
                    ...prev,
                    road_expense_payment_method: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              >
                <option value="cash">cash</option>
                <option value="momo">momo</option>
                <option value="bank">bank</option>
              </select>
              <input
                placeholder="Payment Reference"
                value={roadExpense.road_expense_payment_reference}
                onChange={(event) =>
                  setRoadExpense((prev) => ({
                    ...prev,
                    road_expense_payment_reference: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
              <textarea
                placeholder="Note"
                value={roadExpense.road_expense_note}
                onChange={(event) =>
                  setRoadExpense((prev) => ({
                    ...prev,
                    road_expense_note: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                rows={2}
              />
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) uploadReceiptMutation.mutate(file);
                  }}
                  className="text-xs"
                />
                <button
                  type="button"
                  className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                  onClick={() => roadExpenseMutation.mutate()}
                >
                  Save Road Expense
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-muted/10 p-4">
            <h4 className="text-xs uppercase tracking-widest text-muted-foreground">
              Fuel Allocation (Planned)
            </h4>
            <div className="mt-3 text-sm text-muted-foreground">
              <div>Litres: {trip.fuel_allocated_litres ?? "-"}</div>
              <div>Station: {trip.fuel_allocation_station ?? "-"}</div>
              <div>Mode: {trip.fuel_allocation_payment_mode ?? "-"}</div>
              <div>Reference: {trip.fuel_allocation_reference ?? "-"}</div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-muted/10 p-4">
            <h4 className="text-xs uppercase tracking-widest text-muted-foreground">
              Fuel Allocation (Actual)
            </h4>
            <div className="mt-3 text-sm text-muted-foreground">
              <div>Litres: {trip.fuel_litres_filled ?? "-"}</div>
              <div>Station: {trip.fuel_station_used ?? "-"}</div>
              <div>Mode: {trip.fuel_payment_mode ?? "-"}</div>
              <div>Receipt: {trip.fuel_receipt_no ?? "-"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
