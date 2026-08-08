"use client";

import { useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  ChartColumnIncreasing,
  ClipboardCheck,
  Cog,
  FileText,
  Fuel,
  LogOut,
  MapPin,
  ReceiptText,
  Truck,
  Users,
  Waypoints,
  Wrench,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils/cn";
import { fetchChatInbox } from "@/lib/api/chat";
import { fetchNotificationsUnreadCount } from "@/lib/api/notifications";
import { useAuthStore } from "@/stores/auth.store";
import { AxleLogomark, AXLE_BRAND } from "@/components/branding/AxleLogo";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  section: "Run Today" | "Money" | "Fleet & Safety" | "Admin";
  match?: string[];
};

type SidebarProps = {
  mobileOpen: boolean;
  onClose: () => void;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Command Center", icon: ChartColumnIncreasing, section: "Run Today" },
  { href: "/trips", label: "Trips", icon: Truck, section: "Run Today", match: ["/tracking", "/trip-chats"] },
  { href: "/dispatch", label: "Dispatch", icon: ClipboardCheck, section: "Run Today", match: ["/logistics"] },
  { href: "/notifications", label: "Alerts", icon: Bell, section: "Run Today" },
  { href: "/finance", label: "Finance", icon: ReceiptText, section: "Money", match: ["/expenses"] },
  {
    href: "/fuel-prices",
    label: "Fuel",
    icon: Fuel,
    section: "Money",
    match: ["/fuel-analytics", "/fuel-deposit-reconciliation"],
  },
  { href: "/reports", label: "Reports", icon: FileText, section: "Money" },
  { href: "/operations", label: "Operations", icon: ClipboardCheck, section: "Run Today" },
  { href: "/fleet", label: "Fleet", icon: Waypoints, section: "Fleet & Safety", match: ["/vehicles"] },
  { href: "/maintenance", label: "Maintenance", icon: Wrench, section: "Fleet & Safety" },
  { href: "/destinations", label: "Destinations", icon: MapPin, section: "Fleet & Safety" },
  { href: "/compliance", label: "Compliance", icon: BadgeCheck, section: "Fleet & Safety" },
  { href: "/incidents", label: "Incidents", icon: AlertTriangle, section: "Fleet & Safety" },
  { href: "/driver-intelligence", label: "Drivers", icon: BadgeCheck, section: "Fleet & Safety" },
  { href: "/clients", label: "Clients", icon: Users, section: "Admin", match: ["/client-users"] },
  { href: "/users", label: "Team", icon: Users, section: "Admin" },
  { href: "/audit-trail", label: "Audit Trail", icon: FileText, section: "Admin" },
  { href: "/notifications/preferences", label: "Settings", icon: Cog, section: "Admin", match: ["/notifications/escalation-rules"] },
];

const dispatcherAllowed = new Set([
  "/reports",
  "/logistics",
  "/dispatch",
  "/trip-chats",
  "/notifications",
  "/destinations",
  "/fuel-prices",
  "/expenses",
  "/finance",
  "/trips",
  "/tracking",
]);

const financeAllowed = new Set([
  "/dashboard",
  "/reports",
  "/expenses",
  "/fuel-prices",
  "/fuel-analytics",
  "/fuel-deposit-reconciliation",
  "/incidents",
]);

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const clearSession = useAuthStore((state) => state.clearSession);
  const role = useAuthStore((state) => state.user?.role ?? "admin");
  const [showOnlyAlerts, setShowOnlyAlerts] = useState(false);

  const { data: inbox = [] } = useQuery({
    queryKey: ["chat", "inbox"],
    queryFn: fetchChatInbox,
    refetchInterval: 15_000,
  });

  const unreadCount = inbox.reduce((sum, row) => sum + (Number(row.unread_count) || 0), 0);
  const { data: notificationUnread = {} } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: fetchNotificationsUnreadCount,
    refetchInterval: 20_000,
  });
  const notificationsUnreadCount =
    Number(
      (notificationUnread as Record<string, unknown>).unread_count ??
        (notificationUnread as Record<string, unknown>).count ??
        0
    ) || 0;

  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  const filteredNav = navItems.filter((item) => {
    if (role === "dispatcher") return dispatcherAllowed.has(item.href);
    if (role === "finance") return financeAllowed.has(item.href);
    return true;
  });

  const sections: Array<NavItem["section"]> = ["Run Today", "Money", "Fleet & Safety", "Admin"];

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 md:z-20",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        "md:translate-x-0"
      )}
    >
      <div className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/35 bg-[linear-gradient(140deg,#0A0E1A,#0F172A)] shadow-[0_0_0_1px_rgba(245,158,11,0.08)_inset]">
            <AxleLogomark size={30} color={AXLE_BRAND.amberLight} />
          </div>
          <div>
            <p className="text-base font-semibold tracking-tight">AXLE</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Operations Admin</p>
          </div>
        </div>
      </div>

      <div className="border-b border-sidebar-border p-3">
        <button
          type="button"
          onClick={() => setShowOnlyAlerts((prev) => !prev)}
          className={cn(
            "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold",
            showOnlyAlerts ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
          )}
        >
          <span className="inline-flex items-center gap-2">
            <Bell className="h-3.5 w-3.5" />
            Priority Alerts
          </span>
          <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] text-rose-300">{unreadCount}</span>
        </button>
      </div>

      <nav className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {sections.map((section) => {
          const items = filteredNav.filter((item) => item.section === section);
          if (!items.length) return null;

          return (
            <div key={section} className="space-y-1.5">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{section}</p>
              {items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`) ||
                  Boolean(item.match?.some((href) => pathname === href || pathname.startsWith(`${href}/`)));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition",
                      active
                        ? "border-primary/40 bg-primary/15 text-foreground"
                        : "border-transparent text-muted-foreground hover:border-border hover:bg-card hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                    <span className="truncate">{item.label}</span>
                    {item.href === "/trips" && unreadCount > 0 ? (
                      <span className="ml-auto rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
                        {unreadCount}
                      </span>
                    ) : null}
                    {item.href === "/notifications" && notificationsUnreadCount > 0 ? (
                      <span className="ml-auto rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
                        {notificationsUnreadCount}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <button
          type="button"
          onClick={() => {
            onClose();
            clearSession();
          }}
          className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition hover:bg-card hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
