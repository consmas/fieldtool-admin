"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clientLogin } from "@/lib/api/client-portal";
import { useClientAuthStore } from "@/stores/client-auth.store";
import ThemeToggle from "@/components/theme/ThemeToggle";

export default function ClientLoginPage() {
  const router = useRouter();
  const setSession = useClientAuthStore((state) => state.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await clientLogin({ email, password });
      if (!result.token) {
        throw new Error("No token returned from client auth endpoint.");
      }
      setSession(result.token, (result.user as Record<string, unknown> | null) ?? null);
      router.replace("/client/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto flex max-w-5xl justify-end">
        <ThemeToggle />
      </div>
      <div className="mx-auto mt-8 grid max-w-5xl gap-6 lg:grid-cols-2">
        <section className="ops-card hidden p-8 lg:block">
          <p className="ops-section-title">Axle Client Portal</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Track your shipments and billing in real-time.</h1>
          <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
            <li>Live shipment status and event timeline.</li>
            <li>POD access and feedback submission.</li>
            <li>Invoice visibility and billing summary.</li>
          </ul>
        </section>
        <section className="ops-card p-6 sm:p-8">
          <p className="ops-section-title">Client Access</p>
          <h2 className="mt-2 text-2xl font-semibold">Sign in</h2>
          <p className="mt-2 text-sm text-muted-foreground">Use your client account credentials.</p>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                placeholder="client@company.com"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                placeholder="••••••••"
              />
            </div>
            {error ? <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground">
            Admin user?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Go to Admin Login
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
