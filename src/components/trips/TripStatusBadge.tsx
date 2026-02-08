import { cn } from "@/lib/utils/cn";

const statusStyles: Record<string, string> = {
  planned: "bg-slate-100 text-slate-700",
  assigned: "bg-indigo-100 text-indigo-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
  dispatched: "bg-sky-100 text-sky-700",
};

export default function TripStatusBadge({ status }: { status?: string }) {
  const normalized = status?.toLowerCase() ?? "planned";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        statusStyles[normalized] ?? "bg-slate-100 text-slate-700"
      )}
    >
      {normalized.replace(/_/g, " ")}
    </span>
  );
}
