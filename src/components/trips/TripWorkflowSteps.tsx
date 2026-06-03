"use client";

import { CheckCircle2, Circle, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const workflowSteps = [
  { key: "create", label: "Create", statuses: ["draft", "assigned", "planned", "scheduled"] },
  { key: "dispatch", label: "Dispatch", statuses: ["ready_for_dispatch", "dispatched", "loaded"] },
  { key: "monitor", label: "Monitor", statuses: ["en_route", "in_progress", "in_transit"] },
  { key: "complete", label: "Complete", statuses: ["arrived", "offloaded", "completed"] },
  { key: "reconcile", label: "Reconcile", statuses: ["reconciled"] },
  { key: "close", label: "Close", statuses: ["closed"] },
] as const;

function getActiveIndex(status?: string | null) {
  const normalized = String(status ?? "").toLowerCase();
  const index = workflowSteps.findIndex((step) =>
    (step.statuses as readonly string[]).includes(normalized)
  );
  return index >= 0 ? index : 0;
}

export default function TripWorkflowSteps({
  status,
  compact = false,
}: {
  status?: string | null;
  compact?: boolean;
}) {
  const activeIndex = getActiveIndex(status);

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <div className={cn("grid gap-2", compact ? "grid-cols-3 sm:grid-cols-6" : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6")}>
        {workflowSteps.map((step, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;
          const Icon = done ? CheckCircle2 : active ? CircleDot : Circle;
          return (
            <div
              key={step.key}
              className={cn(
                "flex min-h-10 items-center gap-2 rounded-lg border px-2 py-2 text-xs",
                active
                  ? "border-primary/50 bg-primary/15 text-foreground"
                  : done
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    : "border-border bg-card/70 text-muted-foreground"
              )}
            >
              <Icon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-primary" : "")} />
              <span className="truncate font-semibold">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
