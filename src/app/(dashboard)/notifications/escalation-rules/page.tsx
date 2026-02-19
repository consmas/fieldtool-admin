"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import NotificationTabs from "@/components/notifications/NotificationTabs";
import {
  createEscalationRule,
  fetchActiveEscalations,
  fetchEscalationRules,
  updateEscalationRule,
  type EscalationRulePayload,
} from "@/lib/api/notifications";

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asList(value: unknown) {
  if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
  const payload = asRecord(value);
  const keys = ["data", "items", "results", "rules", "escalations"];
  for (const key of keys) {
    const candidate = payload[key];
    if (Array.isArray(candidate)) return candidate as Array<Record<string, unknown>>;
  }
  return [];
}

function priorityClass(priority: string) {
  const normalized = priority.toLowerCase();
  if (normalized === "critical") return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  if (normalized === "high") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
}

const DEFAULT_FORM: EscalationRulePayload = {
  name: "",
  category: "",
  type: "",
  priority: "high",
  channel: "in_app",
  delay_minutes: 15,
  active: true,
};

export default function EscalationRulesPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [form, setForm] = useState<EscalationRulePayload>(DEFAULT_FORM);

  const rulesQuery = useQuery({
    queryKey: ["notifications", "escalation-rules"],
    queryFn: fetchEscalationRules,
  });
  const activeEscalationsQuery = useQuery({
    queryKey: ["notifications", "active-escalations"],
    queryFn: fetchActiveEscalations,
    refetchInterval: 20_000,
  });

  const saveRuleMutation = useMutation({
    mutationFn: (payload: EscalationRulePayload) => {
      if (editingId === null) return createEscalationRule(payload);
      return updateEscalationRule(editingId, payload);
    },
    onSuccess: () => {
      setForm(DEFAULT_FORM);
      setEditingId(null);
      void queryClient.invalidateQueries({ queryKey: ["notifications", "escalation-rules"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications", "active-escalations"] });
    },
  });

  const rules = useMemo(() => asList(rulesQuery.data), [rulesQuery.data]);
  const activeEscalations = useMemo(() => asList(activeEscalationsQuery.data), [activeEscalationsQuery.data]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <p className="ops-section-title">Communication</p>
        <h2 className="text-xl font-semibold text-foreground md:text-2xl">Escalation Rules</h2>
      </div>

      <NotificationTabs />

      <section className="ops-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          {editingId === null ? "Create Rule" : `Edit Rule #${String(editingId)}`}
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Rule name"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={form.category ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            placeholder="Category"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            value={form.type ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
            placeholder="Type"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <select
            value={form.priority ?? "high"}
            onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={form.channel}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                channel: event.target.value as EscalationRulePayload["channel"],
              }))
            }
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="in_app">in_app</option>
            <option value="push">push</option>
            <option value="sms">sms</option>
            <option value="email">email</option>
          </select>
          <input
            type="number"
            value={form.delay_minutes}
            onChange={(event) => setForm((prev) => ({ ...prev, delay_minutes: Number(event.target.value) || 0 }))}
            placeholder="Delay minutes"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <label className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
            />
            Active
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-primary/40 bg-primary/15 px-3 py-2 text-sm font-medium text-foreground disabled:opacity-60"
            onClick={() => saveRuleMutation.mutate(form)}
            disabled={saveRuleMutation.isPending || !form.name.trim()}
          >
            {saveRuleMutation.isPending ? "Saving..." : editingId === null ? "Create rule" : "Update rule"}
          </button>
          {editingId !== null ? (
            <button
              type="button"
              className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground"
              onClick={() => {
                setEditingId(null);
                setForm(DEFAULT_FORM);
              }}
            >
              Cancel edit
            </button>
          ) : null}
        </div>
      </section>

      <section className="ops-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Configured Rules</h3>
        {rulesQuery.isLoading ? <div className="text-sm text-muted-foreground">Loading rules...</div> : null}
        {rulesQuery.isError ? <div className="text-sm text-rose-300">Unable to load rules.</div> : null}
        {!rulesQuery.isLoading && !rulesQuery.isError && rules.length === 0 ? (
          <div className="text-sm text-muted-foreground">No escalation rules configured.</div>
        ) : null}
        {rules.length > 0 ? (
          <div className="space-y-2">
            {rules.map((row, index) => {
              const id = (row.id ?? row.rule_id ?? index) as number | string;
              const priority = String(row.priority ?? "high");
              return (
                <article key={String(id)} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{String(row.name ?? row.title ?? `Rule ${index + 1}`)}</p>
                        <span className={["rounded-full border px-2 py-0.5 text-[11px] font-semibold", priorityClass(priority)].join(" ")}>
                          {priority}
                        </span>
                        <span className="rounded-full border border-border px-2 py-0.5 text-[11px] uppercase text-muted-foreground">
                          {String(row.channel ?? "in_app")}
                        </span>
                        <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                          {String(row.active ?? true) === "true" ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Category: {String(row.category ?? "-")} · Type: {String(row.type ?? "-")} · Delay:{" "}
                        {String(row.delay_minutes ?? row.delay ?? "-")} min
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-foreground"
                      onClick={() => {
                        setEditingId(id);
                        setForm({
                          id,
                          name: String(row.name ?? ""),
                          category: String(row.category ?? ""),
                          type: String(row.type ?? ""),
                          priority: String(row.priority ?? "high"),
                          channel: String(row.channel ?? "in_app") as EscalationRulePayload["channel"],
                          delay_minutes: Number(row.delay_minutes ?? row.delay ?? 15),
                          active: String(row.active ?? true) === "true",
                        });
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="ops-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Active Escalations Board</h3>
        {activeEscalationsQuery.isLoading ? <div className="text-sm text-muted-foreground">Loading active escalations...</div> : null}
        {activeEscalationsQuery.isError ? <div className="text-sm text-rose-300">Unable to load active escalations.</div> : null}
        {!activeEscalationsQuery.isLoading && !activeEscalationsQuery.isError && activeEscalations.length === 0 ? (
          <div className="text-sm text-muted-foreground">No active escalations.</div>
        ) : null}
        {activeEscalations.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {activeEscalations.map((row, index) => {
              const priority = String(row.priority ?? "high");
              return (
                <article key={String(row.id ?? index)} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={["rounded-full border px-2 py-0.5 text-[11px] font-semibold", priorityClass(priority)].join(" ")}>
                      {priority}
                    </span>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[11px] uppercase text-muted-foreground">
                      {String(row.channel ?? "in_app")}
                    </span>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                      {String(row.status ?? "active")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-foreground">{String(row.title ?? row.name ?? "Escalation")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {String(row.message ?? row.description ?? "-")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Group: {String(row.group_key ?? "-")} · Triggered: {String(row.created_at ?? row.triggered_at ?? "-")}
                  </p>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </div>
  );
}
