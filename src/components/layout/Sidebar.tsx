"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Truck,
  MapPinned,
  Users,
  LogOut,
  ChevronDown,
  Map,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useState } from "react";
import { useAuthStore } from "@/stores/auth.store";

const navItems = [
  { href: "/tracking", label: "Tracking", icon: Map },
  { href: "/users", label: "Users", icon: Users },
  { href: "/vehicles", label: "Vehicles", icon: MapPinned },
  { href: "/reports", label: "Reports", icon: FileText },
];

const tripItems = [
  { href: "/trips", label: "View Trips" },
  { href: "/trips/new", label: "Create Trip" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const clearSession = useAuthStore((state) => state.clearSession);
  const role = useAuthStore((state) => state.user?.role ?? "admin");
  const isTripsActive =
    pathname === "/trips" ||
    pathname.startsWith("/trips/") ||
    pathname === "/trips/new";
  const [isTripsOpen, setIsTripsOpen] = useState(isTripsActive);

  return (
    <aside className="fixed left-0 top-0 flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 border-b border-sidebar-border px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          CM
        </div>
        <div>
          <p className="text-sm font-semibold">ConsMas</p>
          <p className="text-xs text-muted-foreground">FieldTool Admin</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {role !== "dispatcher" ? (
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition",
              pathname === "/dashboard"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            Dashboard
          </Link>
        ) : null}

        <div className="space-y-1">
          <div
            className={cn(
              "flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition",
              isTripsActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
            )}
          >
            <Link href="/trips" className="flex flex-1 items-center gap-3">
              <Truck className="h-4 w-4" />
              Trips
            </Link>
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-sidebar-accent/60"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsTripsOpen((prev) => !prev);
              }}
            >
              <ChevronDown
              className={cn(
                "h-4 w-4 transition",
                isTripsOpen ? "rotate-180" : ""
              )}
            />
            </button>
          </div>

          {isTripsOpen ? (
            <div className="space-y-1 pl-4">
              {tripItems.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-2 text-sm transition",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>

        {navItems
          .filter((item) => {
            if (role === "dispatcher") {
              return item.href === "/reports";
            }
            return true;
          })
          .map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <button
          type="button"
          onClick={() => clearSession()}
          className="flex w-full items-center gap-2 rounded-xl px-4 py-2 text-sm text-muted-foreground transition hover:bg-sidebar-accent/60 hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
