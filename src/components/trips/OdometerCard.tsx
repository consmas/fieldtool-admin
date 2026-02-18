import { formatOdometer } from "@/lib/utils/format";

export default function OdometerCard({
  start,
  end,
}: {
  start?: number | null;
  end?: number | null;
}) {
  return (
    <div className="ops-card p-6">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Odometer
      </h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">Start</p>
          <p className="text-2xl font-semibold">{formatOdometer(start)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">End</p>
          <p className="text-2xl font-semibold">{formatOdometer(end)}</p>
        </div>
      </div>
    </div>
  );
}
