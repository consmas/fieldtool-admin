"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchDriver,
  fetchDriverBadges,
  fetchDriverCurrentScore,
  fetchDriverDocuments,
  fetchDriverScores,
} from "@/lib/api/driver_intelligence";

function toNumber(v: unknown) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function asRecord(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  return v as Record<string, unknown>;
}

export default function DriverDetailPage() {
  const params = useParams();
  const driverId = String(params?.id ?? "");

  const driverQuery = useQuery({
    queryKey: ["driver-intel", "driver", driverId],
    queryFn: () => fetchDriver(driverId),
    enabled: Boolean(driverId),
  });
  const scoresQuery = useQuery({
    queryKey: ["driver-intel", "driver-scores", driverId],
    queryFn: () => fetchDriverScores(driverId),
    enabled: Boolean(driverId),
  });
  const currentScoreQuery = useQuery({
    queryKey: ["driver-intel", "driver-current-score", driverId],
    queryFn: () => fetchDriverCurrentScore(driverId),
    enabled: Boolean(driverId),
  });
  const badgesQuery = useQuery({
    queryKey: ["driver-intel", "driver-badges", driverId],
    queryFn: () => fetchDriverBadges(driverId),
    enabled: Boolean(driverId),
  });
  const documentsQuery = useQuery({
    queryKey: ["driver-intel", "driver-documents", driverId],
    queryFn: () => fetchDriverDocuments(driverId),
    enabled: Boolean(driverId),
  });

  const driver = useMemo(() => asRecord(driverQuery.data), [driverQuery.data]);
  const scores = useMemo(() => scoresQuery.data ?? [], [scoresQuery.data]);
  const current = useMemo(() => asRecord(currentScoreQuery.data), [currentScoreQuery.data]);
  const badges = useMemo(() => badgesQuery.data ?? [], [badgesQuery.data]);
  const documents = useMemo(() => documentsQuery.data ?? [], [documentsQuery.data]);

  const latestScore = toNumber(current.overall_score ?? current.score);
  const lowDimension = useMemo(() => {
    const dimensions = [
      { key: "safety_score", label: "Safety" },
      { key: "efficiency_score", label: "Efficiency" },
      { key: "compliance_score", label: "Compliance" },
      { key: "timeliness_score", label: "Timeliness" },
      { key: "professionalism_score", label: "Professionalism" },
    ];
    return dimensions
      .map((d) => ({ label: d.label, value: toNumber(current[d.key]) }))
      .sort((a, b) => a.value - b.value)[0];
  }, [current]);

  const behavior = useMemo(() => {
    const recent = [...scores].slice(-4).map((x) => x as Record<string, unknown>);
    const trend = (key: string) => {
      if (recent.length < 2) return 0;
      const first = toNumber(recent[0][key]);
      const last = toNumber(recent[recent.length - 1][key]);
      return last - first;
    };
    return {
      incidents: trend("incidents_count"),
      efficiencyVariance: trend("fuel_efficiency_variance"),
      compliance: trend("compliance_completion"),
      lateDeliveries: trend("late_delivery_count"),
    };
  }, [scores]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ops-section-title">Driver Intelligence</p>
          <h2 className="text-lg font-semibold md:text-xl">
            {String(driver.name ?? driver.driver_name ?? `Driver ${driverId}`)}
          </h2>
          <p className="text-sm text-muted-foreground">
            Tier {String(current.tier ?? "-")} · Overall {latestScore.toFixed(1)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/driver-intelligence/leaderboard" className="rounded-lg border border-border px-3 py-2 text-sm">
            Back to Leaderboard
          </Link>
          <Link href="/audit-trail" className="rounded-lg border border-border px-3 py-2 text-sm">
            View Action History
          </Link>
        </div>
      </div>

      {driverQuery.isLoading ? <div className="ops-card p-6 text-sm text-muted-foreground">Loading driver profile...</div> : null}
      {driverQuery.isError ? <div className="ops-card p-6 text-sm text-rose-300">Unable to load driver profile.</div> : null}

      {!driverQuery.isLoading && !driverQuery.isError ? (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="ops-card p-4"><p className="ops-section-title">Current Score</p><p className="mt-2 text-2xl font-bold">{latestScore.toFixed(1)}</p></article>
            <article className="ops-card p-4"><p className="ops-section-title">Tier</p><p className="mt-2 text-2xl font-bold">{String(current.tier ?? "-")}</p></article>
            <article className="ops-card p-4"><p className="ops-section-title">Total Badges</p><p className="mt-2 text-2xl font-bold">{badges.length}</p></article>
            <article className="ops-card p-4"><p className="ops-section-title">Documents</p><p className="mt-2 text-2xl font-bold">{documents.length}</p></article>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <article className="ops-card p-4">
              <h3 className="mb-2 text-sm font-semibold">Score Timeline</h3>
              {scores.length === 0 ? (
                <p className="text-sm text-muted-foreground">No score history.</p>
              ) : (
                <div className="space-y-2">
                  {scores.map((row, index) => {
                    const r = row as Record<string, unknown>;
                    return (
                      <div key={index} className="rounded border border-border p-2 text-sm">
                        <p className="font-medium text-foreground">
                          {String(r.period ?? r.created_at ?? `Point ${index + 1}`)} · {toNumber(r.overall_score ?? r.score).toFixed(1)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          S:{toNumber(r.safety_score).toFixed(1)} E:{toNumber(r.efficiency_score).toFixed(1)} C:{toNumber(r.compliance_score).toFixed(1)} T:{toNumber(r.timeliness_score).toFixed(1)} P:{toNumber(r.professionalism_score).toFixed(1)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
            <article className="ops-card p-4">
              <h3 className="mb-2 text-sm font-semibold">Behavior Tracking</h3>
              <div className="space-y-2 text-sm">
                <div className={`rounded border p-2 ${behavior.incidents > 0 ? "border-rose-500/30 bg-rose-500/10" : "border-emerald-500/30 bg-emerald-500/10"}`}>
                  Incident trend: {behavior.incidents >= 0 ? "+" : ""}{behavior.incidents.toFixed(1)}
                </div>
                <div className={`rounded border p-2 ${behavior.efficiencyVariance > 0 ? "border-amber-500/30 bg-amber-500/10" : "border-emerald-500/30 bg-emerald-500/10"}`}>
                  Fuel efficiency variance trend: {behavior.efficiencyVariance >= 0 ? "+" : ""}{behavior.efficiencyVariance.toFixed(1)}
                </div>
                <div className={`rounded border p-2 ${behavior.compliance < 0 ? "border-rose-500/30 bg-rose-500/10" : "border-emerald-500/30 bg-emerald-500/10"}`}>
                  Compliance completion trend: {behavior.compliance >= 0 ? "+" : ""}{behavior.compliance.toFixed(1)}
                </div>
                <div className={`rounded border p-2 ${behavior.lateDeliveries > 0 ? "border-rose-500/30 bg-rose-500/10" : "border-emerald-500/30 bg-emerald-500/10"}`}>
                  Late-delivery trend: {behavior.lateDeliveries >= 0 ? "+" : ""}{behavior.lateDeliveries.toFixed(1)}
                </div>
              </div>
            </article>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <article className="ops-card p-4">
              <h3 className="mb-2 text-sm font-semibold">Badges</h3>
              {badges.length === 0 ? <p className="text-sm text-muted-foreground">No badges yet.</p> : (
                <div className="space-y-2">{badges.map((badge, i) => {
                  const b = badge as Record<string, unknown>;
                  return <div key={i} className="rounded border border-border p-2 text-sm"><p className="font-medium">{String(b.name ?? b.badge ?? "Badge")}</p><p className="text-xs text-muted-foreground">{String(b.period ?? b.awarded_at ?? "-")}</p></div>;
                })}</div>
              )}
            </article>
            <article className="ops-card p-4">
              <h3 className="mb-2 text-sm font-semibold">Improvement Guidance</h3>
              <p className="text-sm text-muted-foreground">
                Lowest dimension: <span className="font-medium text-foreground">{lowDimension?.label ?? "-"}</span> ({lowDimension?.value.toFixed(1) ?? "0.0"})
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Recommended action: {lowDimension?.label === "Safety" ? "Assign focused safety coaching and incident review." : lowDimension?.label === "Compliance" ? "Schedule compliance remediation and weekly checks." : "Set targeted improvement goals with supervisor."}
              </p>
            </article>
            <article className="ops-card p-4">
              <h3 className="mb-2 text-sm font-semibold">Document Status</h3>
              {documents.length === 0 ? <p className="text-sm text-muted-foreground">No documents.</p> : (
                <div className="space-y-2">{documents.map((doc, i) => {
                  const d = doc as Record<string, unknown>;
                  return <div key={i} className="rounded border border-border p-2 text-sm"><p className="font-medium">{String(d.document_type ?? d.type ?? "Document")}</p><p className="text-xs text-muted-foreground">{String(d.status ?? "active")} · {String(d.verification_status ?? "unverified")} · Expires {String(d.expiry_date ?? "-")}</p></div>;
                })}</div>
              )}
            </article>
          </section>
        </>
      ) : null}
    </div>
  );
}
