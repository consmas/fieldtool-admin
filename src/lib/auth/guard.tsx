"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";

const dispatcherAllowed = [
  /^\/trips$/,
  /^\/trips\/new$/,
  /^\/trips\/\d+$/,
  /^\/trips\/\d+\/edit$/,
  /^\/reports$/,
  /^\/destinations$/,
  /^\/destinations\/\d+$/,
  /^\/fuel-prices$/,
  /^\/logistics$/,
];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const user = useAuthStore((state) => state.user);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const roleAllowed = useMemo(() => {
    const role = user?.role;
    if (!role) return false;
    if (role === "admin" || role === "supervisor") return true;
    if (role === "dispatcher") {
      return dispatcherAllowed.some((pattern) => pattern.test(pathname));
    }
    return false;
  }, [pathname, user?.role]);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, mounted, router]);

  useEffect(() => {
    if (mounted && isAuthenticated && user?.role) {
      if (!roleAllowed) {
        router.replace("/trips");
      }
    }
  }, [isAuthenticated, mounted, roleAllowed, router, user?.role]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Checking session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  if (!roleAllowed) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Checking permissions...</p>
      </div>
    );
  }

  return <>{children}</>;
}
