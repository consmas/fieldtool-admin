import Link from "next/link";
import { BadgeCheck, Truck, Wrench } from "lucide-react";

const fleetActions = [
  {
    href: "/vehicles",
    title: "Vehicles",
    detail: "Review trucks, trailers, insurance, and assignments.",
    icon: Truck,
  },
  {
    href: "/maintenance",
    title: "Maintenance",
    detail: "Work orders, schedules, vendors, and expiring documents.",
    icon: Wrench,
  },
  {
    href: "/compliance",
    title: "Compliance",
    detail: "Driver documents, vehicle compliance, and violations.",
    icon: BadgeCheck,
  },
];

export default function FleetPage() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <p className="ops-section-title">Fleet & Safety</p>
        <h2 className="text-lg font-semibold md:text-xl">Fleet Workflow</h2>
        <p className="text-sm text-muted-foreground">
          Keep vehicles, maintenance, and compliance in one operational lane.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {fleetActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href} className="ops-card p-4 transition hover:bg-accent/30">
              <div className="rounded-md border border-primary/30 bg-primary/10 p-2 text-primary w-fit">
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-foreground">{action.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{action.detail}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
