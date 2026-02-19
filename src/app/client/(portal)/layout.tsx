"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClientGuard } from "@/lib/auth/client-guard";
import { useClientAuthStore } from "@/stores/client-auth.store";
import { clientLogout } from "@/lib/api/client-portal";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/client/dashboard", label: "Dashboard" },
  { href: "/client/shipments", label: "Shipments" },
  { href: "/client/invoices", label: "Invoices" },
  { href: "/client/profile", label: "Profile" },
];

export default function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useClientAuthStore((state) => state.user);
  const clearSession = useClientAuthStore((state) => state.clearSession);

  return (
    <ClientGuard>
      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border bg-card/80 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
            <div>
              <p className="ops-section-title">Axle Client Portal</p>
              <h1 className="text-lg font-semibold">{(user?.company_name as string) ?? "Client Dashboard"}</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground">{(user?.email as string) ?? "client"}</span>
              <button
                type="button"
                className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                onClick={async () => {
                  await clientLogout();
                  clearSession();
                  router.replace("/client/login");
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </header>
        <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6">
          <nav className="ops-card mb-4 flex flex-wrap gap-2 p-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm transition",
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                    ? "border-primary/40 bg-primary/15 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {children}
        </div>
      </div>
    </ClientGuard>
  );
}
