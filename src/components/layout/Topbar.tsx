"use client";

import { Bell, Menu, Search } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import ThemeToggle from "@/components/theme/ThemeToggle";

export default function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const user = useAuthStore((state) => state.user);

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/85 px-6 py-4 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Axle Command Center</p>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Admin Dashboard</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:text-foreground md:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>
          <label className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground md:flex">
            <Search className="h-4 w-4" />
            <input
              type="text"
              placeholder="Search trips, drivers, waybills"
              className="w-64 border-none bg-transparent p-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </label>
          <ThemeToggle />
          <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:text-foreground">
            <Bell className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
              {user?.name?.[0] ?? "A"}
            </div>
            <div className="text-left text-xs leading-tight">
              <p className="font-semibold text-foreground">{user?.name ?? "Admin"}</p>
              <p className="uppercase tracking-wide text-muted-foreground">{user?.role ?? "admin"}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
