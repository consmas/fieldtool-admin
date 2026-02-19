"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchComplianceNotifications,
  fetchDriverComplianceSummary,
  fetchDriverReport,
  fetchDrivers,
  fetchDriversLeaderboard,
} from "@/lib/api/driver_intelligence";

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function getTier(score: number) {
  if (score >= 85) return "platinum";
  if (score >= 75) return "gold";
  if (score >= 65) return "silver";
  if (score >= 50) return "bronze";
  return "probation";
}

function Kpi({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "warn" | "danger" | "good" }) {
  const toneClass =
    tone === "danger"
      ? "border-l-rose-400"
      : tone === "warn"
      ? "border-l-amber-400"
      : tone === "good"
      ? "border-l-emerald-400"
      : "border-l-primary";
  return (
    <article className={`ops-card border-l-2 ${toneClass} p-4`}>
      <p className="ops-section-title">{label}</p>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
    </article>
  );
}

export default function DriverIntelligenceOverviewPage() {
  const [period, setPeriod] = useState<"weekly" | "monthly">("monthly");
  const [tier, setTier] = useState("");
  const [documentStatus, setDocumentStatus] = useState("");

  const driversQuery = useQuery({
    queryKey: ["driver-intel", "drivers", period, tier],
    queryFn: () => fetchDrivers({ period, tier: tier || undefined }),
  });
  const leaderboardQuery = useQuery({
    queryKey: ["driver-intel", "leaderboard", period],
    queryFn: () => fetchDriversLeaderboard({ period }),
  });
  const complianceSummaryQuery = useQuery({
    queryKey: ["driver-intel", "compliance-summary", documentStatus],
    queryFn: fetchDriverComplianceSummary,
  });
  const driverReportQuery = useQuery({
    queryKey: ["driver-intel", "report", period],
    queryFn: () => fetchDriverReport({ period }),
  });
  const notificationsQuery = useQuery({
    queryKey: ["driver-intel", "notifications"],
    queryFn: fetchComplianceNotifications,
  });

  const drivers = useMemo(() => driversQuery.data ?? [], [driversQuery.data]);
  const leaderboard = useMemo(() => leaderboardQuery.data ?? [], [leaderboardQuery.data]);
  const complianceSummary = useMemo(() => asRecord(complianceSummaryQuery.data), [complianceSummaryQuery.data]);
  const report = useMemo(() => asRecord(driverReportQuery.data), [driverReportQuery.data]);
  const notifications = useMemo(() => notificationsQuery.data ?? [], [notificationsQuery.data]);

  const metrics = useMemo(() => {
    const scores = drivers.map((d) =>
      toNumber((d as Record<string, unknown>).overall_score ?? (d as Record<string, unknown>).score)
    );
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const tierCounts = {
      platinum: 0,
      gold: 0,
      silver: 0,
      bronze: 0,
      probation: 0,
    };
    drivers.forEach((driver) => {
      const row = driver as Record<string, unknown>;
      const rowTier = String(row.tier ?? getTier(toNumber(row.overall_score ?? row.score))).toLowerCase();
      if (rowTier in tierCounts) tierCounts[rowTier as keyof typeof tierCounts] += 1;
    });

    const decliningDrivers = leaderboard.filter((row) => {
      const trend = toNumber((row as Record<string, unknown>).trend ?? 0);
      return trend < 0;
    }).length;

    const highRiskDrivers = leaderboard.filter((row) => {
      const r = row as Record<string, unknown>;
      const safety = toNumber(r.safety_score ?? r.safety ?? 0);
      const trend = toNumber(r.trend ?? 0);
      const incidents = toNumber(r.incidents_count ?? 0);
      return safety < 55 && (trend < 0 || incidents >= 3);
    }).length;

    return {
      avgScore,
      tierCounts,
      decliningDrivers,
      highRiskDrivers,
      expiredDocs: toNumber(complianceSummary.expired_count ?? complianceSummary.expired),
      expiringDocs: toNumber(complianceSummary.expiring_30_days_count ?? complianceSummary.expiring_30_days),
      improvedDrivers:
        asRecord(report.top_improved_drivers).count ??
        (Array.isArray(report.top_improved_drivers) ? report.top_improved_drivers.length : 0),
    };
  }, [drivers, leaderboard, complianceSummary, report]);

  const loading =
    driversQuery.isLoading ||
    leaderboardQuery.isLoading ||
    complianceSummaryQuery.isLoading;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ops-section-title">Driver Intelligence</p>
          <h2 className="text-lg font-semibold md:text-xl">Overview</h2>
          <p className="text-sm text-muted-foreground">Performance, behavior, compliance and risk signals in one view.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/driver-intelligence/leaderboard" className="rounded-lg border border-border px-3 py-2 text-sm">
            Leaderboard
          </Link>
          <Link href="/driver-intelligence/risk" className="rounded-lg border border-border px-3 py-2 text-sm">
            Behavior & Risk
          </Link>
          <Link href="/driver-intelligence/scoring-config" className="rounded-lg border border-border px-3 py-2 text-sm">
            Scoring Config
          </Link>
        </div>
      </div>

      <section className="ops-card p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <select value={period} onChange={(e) => setPeriod(e.target.value as "weekly" | "monthly")} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <select value={tier} onChange={(e) => setTier(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option value="">All tiers</option>
            <option value="platinum">Platinum</option>
            <option value="gold">Gold</option>
            <option value="silver">Silver</option>
            <option value="bronze">Bronze</option>
            <option value="probation">Probation</option>
          </select>
          <select value={documentStatus} onChange={(e) => setDocumentStatus(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option value="">All doc status</option>
            <option value="active">Active</option>
            <option value="expiring">Expiring</option>
            <option value="expired">Expired</option>
            <option value="unverified">Unverified</option>
          </select>
        </div>
      </section>

      {loading ? (
        <div className="ops-card p-6 text-sm text-muted-foreground">Loading driver intelligence...</div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Fleet Avg Score" value={metrics.avgScore.toFixed(1)} />
            <Kpi label="Drivers Declining" value={String(metrics.decliningDrivers)} tone="warn" />
            <Kpi label="Expired Documents" value={String(metrics.expiredDocs)} tone="danger" />
            <Kpi label="Expiring (30 Days)" value={String(metrics.expiringDocs)} tone="warn" />
            <Kpi label="Top Improved" value={String(metrics.improvedDrivers)} tone="good" />
            <Kpi label="High Risk Drivers" value={String(metrics.highRiskDrivers)} tone="danger" />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <article className="ops-card p-4">
              <h3 className="mb-3 text-sm font-semibold">Tier Distribution</h3>
              <div className="space-y-2 text-sm">
                {Object.entries(metrics.tierCounts).map(([tierName, count]) => (
                  <div key={tierName} className="flex items-center justify-between rounded border border-border p-2">
                    <span className="capitalize text-muted-foreground">{tierName}</span>
                    <span className="font-semibold text-foreground">{count}</span>
                  </div>
                ))}
              </div>
            </article>
            <article className="ops-card p-4">
              <h3 className="mb-3 text-sm font-semibold">Compliance & Score Alerts</h3>
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent alerts.</p>
              ) : (
                <div className="space-y-2">
                  {notifications.slice(0, 12).map((row, index) => (
                    <div key={index} className="rounded border border-border p-2 text-sm">
                      <p className="font-medium text-foreground">{String((row as Record<string, unknown>).title ?? "Alert")}</p>
                      <p className="text-xs text-muted-foreground">{String((row as Record<string, unknown>).message ?? "-")}</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <Link href="/driver-intelligence" className="text-xs text-primary hover:underline">Open profile</Link>
                        <Link href="/compliance" className="text-xs text-primary hover:underline">Open document</Link>
                        <Link href="/audit-trail" className="text-xs text-primary hover:underline">Acknowledge</Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>
        </>
      )}
    </div>
  );
}
