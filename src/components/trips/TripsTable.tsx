import Link from "next/link";
import TripStatusBadge from "@/components/trips/TripStatusBadge";
import type { Trip } from "@/types/api";
import { formatDate } from "@/lib/utils/format";

export default function TripsTable({
  trips,
  onDelete,
}: {
  trips: Trip[];
  onDelete?: (trip: Trip) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-xs uppercase tracking-widest text-muted-foreground">
          <tr>
            <th className="px-5 py-4">Waybill</th>
            <th className="px-5 py-4">Client</th>
            <th className="px-5 py-4">Destination</th>
            <th className="px-5 py-4">Status</th>
            <th className="px-5 py-4">Driver</th>
            <th className="px-5 py-4">Trip Date</th>
            <th className="px-5 py-4">Vehicle</th>
            <th className="px-5 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {trips.map((trip) => (
            <tr
              key={trip.id}
              className="border-t border-border transition hover:bg-muted/50"
            >
              <td className="px-5 py-4">
                <Link
                  href={`/trips/${trip.id}`}
                  className="font-semibold text-foreground hover:text-primary"
                >
                  {trip.waybill_number ?? trip.reference_code ?? `Trip ${trip.id}`}
                </Link>
              </td>
              <td className="px-5 py-4 text-muted-foreground">
                {trip.client_name ?? "-"}
              </td>
              <td className="px-5 py-4 text-muted-foreground">
                <div>
                  <p>{trip.destination ?? trip.dropoff_location ?? "-"}</p>
                  {trip.delivery_address ? (
                    <p className="text-xs">{trip.delivery_address}</p>
                  ) : null}
                  {trip.delivery_lat !== null &&
                  trip.delivery_lat !== undefined &&
                  trip.delivery_lng !== null &&
                  trip.delivery_lng !== undefined ? (
                    <p className="mt-1 inline-block rounded-full border border-border px-2 py-0.5 text-[10px]">
                      {Number(trip.delivery_lat).toFixed(5)}, {Number(trip.delivery_lng).toFixed(5)}
                    </p>
                  ) : null}
                </div>
              </td>
              <td className="px-5 py-4">
                <TripStatusBadge status={trip.status} />
              </td>
              <td className="px-5 py-4 text-muted-foreground">
                {trip.driver?.name ?? "Unassigned"}
              </td>
              <td className="px-5 py-4 text-muted-foreground">
                {formatDate(trip.trip_date ?? trip.scheduled_pickup_at ?? undefined)}
              </td>
              <td className="px-5 py-4 text-muted-foreground">
                {trip.vehicle?.name ?? "-"}
              </td>
              <td className="px-5 py-4">
                <div className="flex justify-end gap-2">
                  <Link
                    href={`/trips/${trip.id}`}
                    className="rounded-lg border border-border px-3 py-1 text-xs"
                  >
                    View
                  </Link>
                  <Link
                    href={`/trips/${trip.id}/edit`}
                    className="rounded-lg border border-border px-3 py-1 text-xs"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/trip-chats/${trip.id}`}
                    className="rounded-lg border border-border px-3 py-1 text-xs"
                  >
                    Chat
                  </Link>
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
                      className="rounded-lg border border-border px-3 py-1 text-xs"
                    >
                      Map
                    </a>
                  ) : null}
                  <button
                    type="button"
                    className="rounded-lg border border-border px-3 py-1 text-xs text-rose-500"
                    onClick={() => onDelete?.(trip)}
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
  );
}
