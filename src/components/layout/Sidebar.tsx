"use client";

import { useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChartColumnIncreasing,
  ClipboardCheck,
  FileText,
  Fuel,
  LogOut,
  Map,
  MapPin,
  MessageSquare,
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

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  section: "Command" | "Operations" | "Finance";
};

type SidebarProps = {
  mobileOpen: boolean;
  onClose: () => void;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: ChartColumnIncreasing, section: "Command" },
  { href: "/logistics", label: "Logistics", icon: ClipboardCheck, section: "Command" },
  { href: "/notifications", label: "Notifications", icon: Bell, section: "Command" },
  { href: "/trips", label: "Trips", icon: Truck, section: "Operations" },
  { href: "/tracking", label: "Tracking", icon: Map, section: "Operations" },
  { href: "/trip-chats", label: "Trip Chats", icon: MessageSquare, section: "Operations" },
  { href: "/maintenance", label: "Maintenance", icon: Wrench, section: "Operations" },
  { href: "/destinations", label: "Destinations", icon: MapPin, section: "Operations" },
  { href: "/vehicles", label: "Vehicles", icon: Waypoints, section: "Operations" },
  { href: "/fuel-prices", label: "Fuel Prices", icon: Fuel, section: "Finance" },
  { href: "/expenses", label: "Expenses", icon: ReceiptText, section: "Finance" },
  { href: "/reports", label: "Reports", icon: FileText, section: "Finance" },
  { href: "/users", label: "Users", icon: Users, section: "Finance" },
];

const dispatcherAllowed = new Set([
  "/reports",
  "/logistics",
  "/trip-chats",
  "/notifications",
  "/destinations",
  "/fuel-prices",
  "/expenses",
  "/trips",
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
    return true;
  });

  const sections: Array<NavItem["section"]> = ["Command", "Operations", "Finance"];

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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            AX
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">Axle</p>
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
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
                    {item.href === "/trip-chats" && unreadCount > 0 ? (
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
