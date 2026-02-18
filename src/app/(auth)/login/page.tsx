"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, extractToken } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/auth.store";

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await login({ email, password });
      const token = extractToken(response);

      if (!token) {
        throw new Error("No token returned. Confirm the API response shape.");
      }

      const user =
        "data" in response && response.data
          ? response.data.user
          : "user" in response
          ? response.user
          : null;
      setSession(token, user ?? null);
      router.replace("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden overflow-hidden border-r border-border bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.22),transparent_48%),radial-gradient(circle_at_80%_80%,rgba(14,165,233,0.18),transparent_42%)] lg:block">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(100,116,139,0.16)_1px,transparent_1px),linear-gradient(to_bottom,rgba(100,116,139,0.16)_1px,transparent_1px)] bg-[size:36px_36px]" />
          <div className="relative z-10 flex h-full flex-col justify-between p-10">
            <div>
              <div className="inline-flex items-center gap-3 rounded-lg border border-border bg-card/80 px-3 py-2 backdrop-blur">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                  AX
                </div>
                <p className="text-sm font-semibold tracking-tight">Axle Admin</p>
              </div>
              <h2 className="mt-8 max-w-md text-4xl font-semibold leading-tight tracking-tight">
                Fleet operations visibility, approvals, and control in one place.
              </h2>
            </div>

            <div className="grid max-w-lg gap-3">
              {[
                "Live trip and logistics monitoring",
                "Expense and fuel workflow approvals",
                "Driver, vehicle, and reporting controls",
              ].map((item) => (
                <div key={item} className="rounded-lg border border-border bg-card/80 px-4 py-3 text-sm text-muted-foreground backdrop-blur">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-[0_18px_60px_rgba(0,0,0,0.35)] sm:p-8">
            <div className="mb-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Axle
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign in to Admin</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Use your dispatcher or supervisor credentials.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
                  placeholder="••••••••"
                />
              </div>
              {error ? (
                <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
