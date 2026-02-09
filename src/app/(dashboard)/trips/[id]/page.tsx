"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchTrip } from "@/lib/api/trips";
import TripHeader from "@/components/trips/TripHeader";
import TripTimeline from "@/components/trips/TripTimeline";
import OdometerCard from "@/components/trips/OdometerCard";
import GoogleMap from "@/components/maps/GoogleMap";
import { fetchPreTrip } from "@/lib/api/pretrip";
import { formatDate } from "@/lib/utils/format";

export default function TripDetailPage() {
  const params = useParams();
  const tripId = String(params?.id ?? "");

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
    refetchInterval: 30_000,
  });

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
    </div>
  );
}
