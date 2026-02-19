"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDriverCurrentScore, fetchDriversLeaderboard } from "@/lib/api/driver_intelligence";

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

type SortKey = "overall" | "safety" | "trend" | "badges";

export default function DriverLeaderboardPage() {
  const [sortBy, setSortBy] = useState<SortKey>("overall");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [selectedDriver, setSelectedDriver] = useState<string | number | null>(null);

  const leaderboardQuery = useQuery({
    queryKey: ["driver-intel", "leaderboard", sortBy, order],
    queryFn: () =>
      fetchDriversLeaderboard({
        sort_by: sortBy,
        sort_order: order,
      }),
  });

  const currentScoreQuery = useQuery({
    queryKey: ["driver-intel", "current-score", selectedDriver],
    queryFn: () => fetchDriverCurrentScore(selectedDriver as string | number),
    enabled: selectedDriver !== null,
  });

  const rows = useMemo(() => {
    const data = leaderboardQuery.data ?? [];
    return [...data].sort((a, b) => {
      const left = a as Record<string, unknown>;
      const right = b as Record<string, unknown>;
      const getValue = (row: Record<string, unknown>) => {
        switch (sortBy) {
          case "safety":
            return toNumber(row.safety_score ?? row.safety);
          case "trend":
            return toNumber(row.trend ?? row.trend_score);
          case "badges":
            return toNumber(row.badges_count ?? row.badges);
          default:
            return toNumber(row.overall_score ?? row.score);
        }
      };
      const diff = getValue(left) - getValue(right);
      return order === "asc" ? diff : -diff;
    });
  }, [leaderboardQuery.data, order, sortBy]);

  const currentScore = useMemo(
    () => (currentScoreQuery.data ?? {}) as Record<string, unknown>,
    [currentScoreQuery.data]
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ops-section-title">Driver Intelligence</p>
          <h2 className="text-lg font-semibold md:text-xl">Driver Leaderboard</h2>
        </div>
        <Link href="/driver-intelligence" className="rounded-lg border border-border px-3 py-2 text-sm">
          Back to Overview
        </Link>
      </div>

      <section className="ops-card p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option value="overall">Sort: Overall Score</option>
            <option value="safety">Sort: Safety</option>
            <option value="trend">Sort: Trend</option>
            <option value="badges">Sort: Badges</option>
          </select>
          <select value={order} onChange={(e) => setOrder(e.target.value as "asc" | "desc")} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option value="desc">Highest first</option>
            <option value="asc">Lowest first</option>
          </select>
        </div>
      </section>

      <section className="ops-card p-4">
        {leaderboardQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading leaderboard...</p> : null}
        {leaderboardQuery.isError ? <p className="text-sm text-rose-300">Unable to load leaderboard.</p> : null}
        {!leaderboardQuery.isLoading && !leaderboardQuery.isError && rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leaderboard data.</p>
        ) : null}
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="py-2">Rank</th>
                  <th className="py-2">Driver</th>
                  <th className="py-2">Overall</th>
                  <th className="py-2">Tier</th>
                  <th className="py-2">Trend</th>
                  <th className="py-2">Safety</th>
                  <th className="py-2">Efficiency</th>
                  <th className="py-2">Compliance</th>
                  <th className="py-2">Timeliness</th>
                  <th className="py-2">Professionalism</th>
                  <th className="py-2">Badges</th>
                  <th className="py-2">Last Updated</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const r = row as Record<string, unknown>;
                  const driverId = (r.driver_id ?? r.id ?? idx) as string | number;
                  return (
                    <tr key={String(driverId)} className="border-t border-border">
                      <td className="py-2 text-muted-foreground">{idx + 1}</td>
                      <td className="py-2 text-foreground">{String(r.driver_name ?? r.name ?? `Driver ${driverId}`)}</td>
                      <td className="py-2 text-muted-foreground">{toNumber(r.overall_score ?? r.score).toFixed(1)}</td>
                      <td className="py-2 text-muted-foreground">{String(r.tier ?? "-")}</td>
                      <td className={`py-2 ${toNumber(r.trend) < 0 ? "text-rose-300" : "text-emerald-300"}`}>{toNumber(r.trend).toFixed(1)}</td>
                      <td className="py-2 text-muted-foreground">{toNumber(r.safety_score ?? r.safety).toFixed(1)}</td>
                      <td className="py-2 text-muted-foreground">{toNumber(r.efficiency_score ?? r.efficiency).toFixed(1)}</td>
                      <td className="py-2 text-muted-foreground">{toNumber(r.compliance_score ?? r.compliance).toFixed(1)}</td>
                      <td className="py-2 text-muted-foreground">{toNumber(r.timeliness_score ?? r.timeliness).toFixed(1)}</td>
                      <td className="py-2 text-muted-foreground">{toNumber(r.professionalism_score ?? r.professionalism).toFixed(1)}</td>
                      <td className="py-2 text-muted-foreground">{toNumber(r.badges_count ?? r.badges)}</td>
                      <td className="py-2 text-muted-foreground">{String(r.updated_at ?? r.last_updated_at ?? "-")}</td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <Link href={`/driver-intelligence/${driverId}`} className="rounded border border-border px-2 py-1 text-xs">
                            Open
                          </Link>
                          <button type="button" className="rounded border border-border px-2 py-1 text-xs" onClick={() => setSelectedDriver(driverId)}>
                            Current Score
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {selectedDriver !== null ? (
        <section className="ops-card p-4">
          <h3 className="text-sm font-semibold">Current Score Snapshot</h3>
          {currentScoreQuery.isLoading ? <p className="mt-2 text-sm text-muted-foreground">Loading current score...</p> : null}
          {!currentScoreQuery.isLoading ? (
            <pre className="mt-2 overflow-x-auto rounded border border-border bg-card p-3 text-xs text-muted-foreground">
              {JSON.stringify(currentScore, null, 2)}
            </pre>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
