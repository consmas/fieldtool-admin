"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDriversLeaderboard, fetchFuelAnomalies } from "@/lib/api/driver_intelligence";

function toNumber(v: unknown) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function riskBand(score: number) {
  if (score >= 70) return { label: "High", className: "border-rose-500/30 bg-rose-500/10 text-rose-300" };
  if (score >= 45) return { label: "Medium", className: "border-amber-500/30 bg-amber-500/10 text-amber-300" };
  return { label: "Low", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" };
}

export default function DriverRiskPage() {
  const leaderboardQuery = useQuery({
    queryKey: ["driver-risk", "leaderboard"],
    queryFn: () => fetchDriversLeaderboard(),
  });
  const anomaliesQuery = useQuery({
    queryKey: ["driver-risk", "fuel-anomalies"],
    queryFn: () => fetchFuelAnomalies(),
  });

  const rows = useMemo(() => {
    const leaderboard = leaderboardQuery.data ?? [];
    const anomalies = anomaliesQuery.data ?? [];
    return leaderboard.map((row) => {
      const r = row as Record<string, unknown>;
      const driverId = String(r.driver_id ?? r.id ?? "");
      const safety = toNumber(r.safety_score ?? r.safety);
      const compliance = toNumber(r.compliance_score ?? r.compliance);
      const trend = toNumber(r.trend ?? 0);
      const incidents = toNumber(r.incidents_count ?? 0);
      const driverAnomalies = anomalies.filter((a) => String((a as Record<string, unknown>).driver_id ?? "") === driverId).length;
      const riskScore =
        Math.max(0, 60 - safety) +
        Math.max(0, 55 - compliance) +
        Math.max(0, -trend * 2) +
        incidents * 6 +
        driverAnomalies * 8;
      return {
        driverId,
        driverName: String(r.driver_name ?? r.name ?? `Driver ${driverId}`),
        safety,
        compliance,
        trend,
        incidents,
        anomalies: driverAnomalies,
        riskScore,
      };
    }).sort((a, b) => b.riskScore - a.riskScore);
  }, [anomaliesQuery.data, leaderboardQuery.data]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ops-section-title">Driver Intelligence</p>
          <h2 className="text-lg font-semibold md:text-xl">Behavior & Risk Analytics</h2>
          <p className="text-sm text-muted-foreground">Red: declining + unsafe/compliance below threshold. Amber: below target but stable.</p>
        </div>
        <Link href="/driver-intelligence" className="rounded-lg border border-border px-3 py-2 text-sm">
          Back to Overview
        </Link>
      </div>

      {leaderboardQuery.isLoading || anomaliesQuery.isLoading ? (
        <div className="ops-card p-6 text-sm text-muted-foreground">Loading risk analytics...</div>
      ) : leaderboardQuery.isError || anomaliesQuery.isError ? (
        <div className="ops-card p-6 text-sm text-rose-300">Unable to load risk analytics.</div>
      ) : rows.length === 0 ? (
        <div className="ops-card p-6 text-sm text-muted-foreground">No risk data available.</div>
      ) : (
        <section className="ops-card p-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="py-2">Driver</th>
                  <th className="py-2">Risk Score</th>
                  <th className="py-2">Band</th>
                  <th className="py-2">Safety</th>
                  <th className="py-2">Compliance</th>
                  <th className="py-2">Trend</th>
                  <th className="py-2">Incidents</th>
                  <th className="py-2">Fuel Anomalies</th>
                  <th className="py-2">Escalation Suggestion</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const band = riskBand(row.riskScore);
                  const alertState =
                    row.trend < 0 && (row.safety < 55 || row.compliance < 55)
                      ? "red"
                      : row.safety < 65 || row.compliance < 65
                      ? "amber"
                      : "green";
                  const escalation =
                    alertState === "red"
                      ? "Supervision + temporary restrictions + compliance remediation"
                      : alertState === "amber"
                      ? "Coaching + weekly monitoring"
                      : "Maintain current coaching cadence";
                  return (
                    <tr key={row.driverId} className="border-t border-border">
                      <td className="py-2 font-medium text-foreground">
                        <Link href={`/driver-intelligence/${row.driverId}`} className="hover:underline">
                          {row.driverName}
                        </Link>
                      </td>
                      <td className="py-2 text-muted-foreground">{row.riskScore.toFixed(1)}</td>
                      <td className="py-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${band.className}`}>
                          {band.label}
                        </span>
                      </td>
                      <td className="py-2 text-muted-foreground">{row.safety.toFixed(1)}</td>
                      <td className="py-2 text-muted-foreground">{row.compliance.toFixed(1)}</td>
                      <td className={`${row.trend < 0 ? "text-rose-300" : "text-emerald-300"} py-2`}>
                        {row.trend.toFixed(1)}
                      </td>
                      <td className="py-2 text-muted-foreground">{row.incidents}</td>
                      <td className="py-2 text-muted-foreground">{row.anomalies}</td>
                      <td className={`py-2 text-xs ${alertState === "red" ? "text-rose-300" : alertState === "amber" ? "text-amber-300" : "text-emerald-300"}`}>
                        {escalation}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
