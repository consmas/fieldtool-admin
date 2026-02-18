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
    <div className="ops-card overflow-hidden">
      <div className="md:hidden space-y-2 p-3">
        {trips.map((trip) => (
          <div key={trip.id} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/trips/${trip.id}`} className="font-semibold text-foreground hover:text-primary">
                {trip.waybill_number ?? trip.reference_code ?? `Trip ${trip.id}`}
              </Link>
              <TripStatusBadge status={trip.status} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{trip.client_name ?? "-"}</p>
            <p className="text-xs text-muted-foreground">{trip.destination ?? trip.dropoff_location ?? "-"}</p>
            <p className="text-xs text-muted-foreground">{trip.driver?.name ?? "Unassigned"} • {trip.vehicle?.name ?? "-"}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link href={`/trips/${trip.id}`} className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">View</Link>
              <Link href={`/trips/${trip.id}/edit`} className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">Edit</Link>
              <Link href={`/trip-chats/${trip.id}`} className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">Chat</Link>
              <button type="button" className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs text-rose-300" onClick={() => onDelete?.(trip)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
      <table className="min-w-[980px] w-full text-sm">
        <thead className="bg-muted/60 text-left text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
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
              className="border-t border-border/80 transition hover:bg-accent/50"
            >
              <td className="px-5 py-4">
                <Link
                  href={`/trips/${trip.id}`}
                  className="font-semibold text-foreground hover:text-primary hover:underline"
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
                    className="rounded-md border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition hover:text-foreground"
                  >
                    View
                  </Link>
                  <Link
                    href={`/trips/${trip.id}/edit`}
                    className="rounded-md border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition hover:text-foreground"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/trip-chats/${trip.id}`}
                    className="rounded-md border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition hover:text-foreground"
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
                      className="rounded-md border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition hover:text-foreground"
                    >
                      Map
                    </a>
                  ) : null}
                  <button
                    type="button"
                    className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-300"
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
    </div>
  );
}
