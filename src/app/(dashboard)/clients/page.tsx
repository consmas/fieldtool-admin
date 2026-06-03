import Link from "next/link";
import { PackageSearch, UserPlus, Users } from "lucide-react";

const clientActions = [
  {
    href: "/client-users",
    title: "Client Users",
    detail: "Create and manage portal access.",
    icon: Users,
  },
  {
    href: "/trips/new",
    title: "New Client Trip",
    detail: "Enter client details directly during trip creation.",
    icon: UserPlus,
  },
  {
    href: "/client/shipments",
    title: "Client Portal View",
    detail: "Review the shipment experience clients see.",
    icon: PackageSearch,
  },
];

export default function ClientsPage() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <p className="ops-section-title">Clients</p>
        <h2 className="text-lg font-semibold md:text-xl">Client Workflow</h2>
        <p className="text-sm text-muted-foreground">
          Handle one-off clients and saved portal users without blocking dispatch.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {clientActions.map((action) => {
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
