import Link from "next/link";
import { BarChart3, Fuel, ReceiptText } from "lucide-react";

const financeActions = [
  {
    href: "/expenses",
    title: "Review Expenses",
    detail: "Approve, reject, pay, and audit road expenses.",
    icon: ReceiptText,
  },
  {
    href: "/fuel-prices",
    title: "Manage Fuel",
    detail: "Fuel prices, OMC wallet, deposits, ledger, and anomalies.",
    icon: Fuel,
  },
  {
    href: "/reports?tab=expenses",
    title: "Export Reports",
    detail: "Trip, expense, driver, vehicle, and audit reports.",
    icon: BarChart3,
  },
];

export default function FinancePage() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <p className="ops-section-title">Money</p>
        <h2 className="text-lg font-semibold md:text-xl">Finance Workflow</h2>
        <p className="text-sm text-muted-foreground">
          Reconcile trip money from one entry point.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {financeActions.map((action) => {
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
