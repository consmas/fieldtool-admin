"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const tabs = [
  { href: "/notifications", label: "Notifications" },
  { href: "/notifications/preferences", label: "Preferences" },
  { href: "/notifications/escalation-rules", label: "Escalation Rules" },
];

export default function NotificationTabs() {
  const pathname = usePathname();

  return (
    <div className="ops-card p-2">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm font-medium transition",
                active
                  ? "border-primary/40 bg-primary/15 text-foreground"
                  : "border-border text-muted-foreground hover:bg-card hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
