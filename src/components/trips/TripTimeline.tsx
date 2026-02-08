import type { Trip } from "@/types/api";
import { formatDate } from "@/lib/utils/format";

export default function TripTimeline({ events }: { events?: Trip["events"] }) {
  const items = events ?? [];

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
        Timeline data will appear once the trip is in motion.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Timeline
      </h3>
      <div className="mt-4 space-y-4">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-4">
            <div className="mt-2 h-2 w-2 rounded-full bg-primary" />
            <div>
              <p className="font-semibold text-foreground">
                {item.message ?? item.event_type}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(item.created_at ?? undefined)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
