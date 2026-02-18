import { cn } from "@/lib/utils/cn";

const statusStyles: Record<string, string> = {
  planned: "border-slate-500/30 bg-slate-500/15 text-slate-300",
  scheduled: "border-slate-500/30 bg-slate-500/15 text-slate-300",
  assigned: "border-indigo-500/30 bg-indigo-500/15 text-indigo-300",
  in_progress: "border-amber-500/30 bg-amber-500/15 text-amber-300",
  en_route: "border-sky-500/30 bg-sky-500/15 text-sky-300",
  loaded: "border-violet-500/30 bg-violet-500/15 text-violet-300",
  arrived: "border-blue-500/30 bg-blue-500/15 text-blue-300",
  offloaded: "border-cyan-500/30 bg-cyan-500/15 text-cyan-300",
  completed: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
  cancelled: "border-rose-500/30 bg-rose-500/15 text-rose-300",
  blocked: "border-rose-500/30 bg-rose-500/15 text-rose-300",
  delayed: "border-amber-500/30 bg-amber-500/15 text-amber-300",
  dispatched: "border-sky-500/30 bg-sky-500/15 text-sky-300",
};

export default function TripStatusBadge({ status }: { status?: string }) {
  const normalized = status?.toLowerCase() ?? "planned";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        statusStyles[normalized] ?? "border-slate-500/30 bg-slate-500/15 text-slate-300"
      )}
    >
      {normalized.replace(/_/g, " ")}
    </span>
  );
}
