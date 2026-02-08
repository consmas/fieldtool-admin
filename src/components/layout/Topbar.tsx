"use client";

import { Bell, Search } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";

export default function Topbar() {
  const user = useAuthStore((state) => state.user);

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card/60 px-6 py-4 backdrop-blur">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          ConsMas FieldTool
        </p>
        <h1 className="text-xl font-semibold">Admin Console</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm text-muted-foreground md:flex">
          <Search className="h-4 w-4" />
          Search trips, drivers...
        </div>
        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-border">
          <Bell className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {user?.name?.[0] ?? "A"}
          </div>
          <div className="text-left text-xs">
            <p className="font-semibold text-foreground">
              {user?.name ?? "Admin"}
            </p>
            <p className="text-muted-foreground">{user?.role ?? "admin"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
