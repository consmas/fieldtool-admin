import TripStatusBadge from "@/components/trips/TripStatusBadge";
import type { Trip } from "@/types/api";
import { formatDate } from "@/lib/utils/format";

export default function TripHeader({ trip }: { trip: Trip }) {
  return (
    <div className="ops-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Waybill Details
          </p>
          <h2 className="text-2xl font-semibold">
            {trip.waybill_number ?? trip.reference_code ?? `Trip ${trip.id}`}
          </h2>
        </div>
        <TripStatusBadge status={trip.status} />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Client</p>
          <p className="font-semibold">{trip.client_name ?? "-"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Driver</p>
          <p className="font-semibold">{trip.driver?.name ?? "Unassigned"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Destination</p>
          <p className="font-semibold">
            {trip.destination ?? trip.dropoff_location ?? "-"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Trip Date</p>
          <p className="font-semibold">
            {formatDate(trip.trip_date ?? trip.scheduled_pickup_at ?? undefined)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Vehicle</p>
          <p className="font-semibold">
            {trip.vehicle?.name ?? "-"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Waybill</p>
          <p className="font-semibold">
            {trip.waybill_number ?? trip.reference_code ?? "-"}
          </p>
        </div>
      </div>
    </div>
  );
}
