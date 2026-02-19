"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchScoringConfig, updateScoringConfig } from "@/lib/api/driver_intelligence";

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

type ScoringForm = {
  safety: string;
  efficiency: string;
  compliance: string;
  timeliness: string;
  professionalism: string;
  platinum: string;
  gold: string;
  silver: string;
  bronze: string;
};

const defaultForm: ScoringForm = {
  safety: "0.25",
  efficiency: "0.20",
  compliance: "0.20",
  timeliness: "0.20",
  professionalism: "0.15",
  platinum: "85",
  gold: "75",
  silver: "65",
  bronze: "50",
};

export default function ScoringConfigPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ScoringForm>(defaultForm);
  const [message, setMessage] = useState<string | null>(null);

  const configQuery = useQuery({
    queryKey: ["driver-intel", "scoring-config"],
    queryFn: fetchScoringConfig,
  });

  useEffect(() => {
    const cfg = (configQuery.data ?? {}) as Record<string, unknown>;
    const weights = (cfg.weights ?? {}) as Record<string, unknown>;
    const thresholds = (cfg.tier_thresholds ?? cfg.thresholds ?? {}) as Record<string, unknown>;
    setForm({
      safety: String(weights.safety ?? defaultForm.safety),
      efficiency: String(weights.efficiency ?? defaultForm.efficiency),
      compliance: String(weights.compliance ?? defaultForm.compliance),
      timeliness: String(weights.timeliness ?? defaultForm.timeliness),
      professionalism: String(weights.professionalism ?? defaultForm.professionalism),
      platinum: String(thresholds.platinum ?? defaultForm.platinum),
      gold: String(thresholds.gold ?? defaultForm.gold),
      silver: String(thresholds.silver ?? defaultForm.silver),
      bronze: String(thresholds.bronze ?? defaultForm.bronze),
    });
  }, [configQuery.data]);

  const weightSum = useMemo(
    () =>
      toNumber(form.safety) +
      toNumber(form.efficiency) +
      toNumber(form.compliance) +
      toNumber(form.timeliness) +
      toNumber(form.professionalism),
    [form]
  );

  const simulatedShift = useMemo(() => {
    const gold = toNumber(form.gold);
    const bronze = toNumber(form.bronze);
    if (gold - bronze > 30) return "Higher concentration in bronze/silver tiers expected.";
    if (gold - bronze < 20) return "Broader movement into gold tier expected.";
    return "Balanced tier distribution expected.";
  }, [form.bronze, form.gold]);

  const updateMutation = useMutation({
    mutationFn: () =>
      updateScoringConfig({
        weights: {
          safety: toNumber(form.safety),
          efficiency: toNumber(form.efficiency),
          compliance: toNumber(form.compliance),
          timeliness: toNumber(form.timeliness),
          professionalism: toNumber(form.professionalism),
        },
        tier_thresholds: {
          platinum: toNumber(form.platinum),
          gold: toNumber(form.gold),
          silver: toNumber(form.silver),
          bronze: toNumber(form.bronze),
        },
      }),
    onSuccess: async () => {
      setMessage("Scoring configuration updated.");
      await queryClient.invalidateQueries({ queryKey: ["driver-intel", "scoring-config"] });
    },
    onError: () => setMessage("Unable to update scoring configuration."),
  });

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ops-section-title">Driver Intelligence</p>
          <h2 className="text-lg font-semibold md:text-xl">Scoring Configuration</h2>
          <p className="text-sm text-muted-foreground">Adjust scoring weights and tier thresholds with validation and preview.</p>
        </div>
        <Link href="/driver-intelligence" className="rounded-lg border border-border px-3 py-2 text-sm">
          Back to Overview
        </Link>
      </div>

      <section className="ops-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Weights (must total 1.0)</h3>
        <div className="grid gap-3 md:grid-cols-5">
          {(["safety", "efficiency", "compliance", "timeliness", "professionalism"] as const).map((key) => (
            <label key={key} className="text-xs text-muted-foreground">
              {key}
              <input value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground" />
            </label>
          ))}
        </div>
        <p className={`mt-2 text-sm ${Math.abs(weightSum - 1) < 0.0001 ? "text-emerald-300" : "text-rose-300"}`}>
          Weight sum: {weightSum.toFixed(3)}
        </p>
      </section>

      <section className="ops-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Tier Thresholds</h3>
        <div className="grid gap-3 md:grid-cols-4">
          {(["platinum", "gold", "silver", "bronze"] as const).map((key) => (
            <label key={key} className="text-xs text-muted-foreground">
              {key}
              <input value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground" />
            </label>
          ))}
        </div>
      </section>

      <section className="ops-card p-4">
        <h3 className="mb-2 text-sm font-semibold">Impact Preview</h3>
        <p className="text-sm text-muted-foreground">{simulatedShift}</p>
      </section>

      {message ? <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{message}</p> : null}

      <button
        type="button"
        disabled={updateMutation.isPending || Math.abs(weightSum - 1) > 0.0001}
        onClick={() => updateMutation.mutate()}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {updateMutation.isPending ? "Saving..." : "Save Configuration"}
      </button>
    </div>
  );
}
