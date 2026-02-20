"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchIncident, updateIncidentStatus } from "@/lib/api/compliance_incidents";
import { fetchAuditResourceHistory } from "@/lib/api/compliance_incidents";

type TabKey = "summary" | "evidence" | "witnesses" | "activity" | "claims" | "audit";

export default function IncidentDetailPage() {
  const params = useParams();
  const incidentId = String(params?.id ?? "");
  const [activeTab, setActiveTab] = useState<TabKey>("summary");
  const [nextStatus, setNextStatus] = useState("investigating");

  const incidentQuery = useQuery({
    queryKey: ["incidents", "detail", incidentId],
    queryFn: () => fetchIncident(incidentId),
    enabled: Boolean(incidentId),
  });

  const auditQuery = useQuery({
    queryKey: ["incidents", "audit", incidentId],
    queryFn: () => fetchAuditResourceHistory("Incident", incidentId),
    enabled: Boolean(incidentId) && activeTab === "audit",
  });

  const statusMutation = useMutation({
    mutationFn: () => updateIncidentStatus(incidentId, { status: nextStatus }),
  });

  const incident = useMemo(() => (incidentQuery.data ?? {}) as Record<string, unknown>, [incidentQuery.data]);
  const claims = useMemo(() => {
    const raw = incident.insurance_claims;
    if (Array.isArray(raw)) return raw as Array<Record<string, unknown>>;
    return [];
  }, [incident.insurance_claims]);

  const tabButtons: Array<{ key: TabKey; label: string }> = [
    { key: "summary", label: "Summary" },
    { key: "evidence", label: "Evidence" },
    { key: "witnesses", label: "Witnesses" },
    { key: "activity", label: "Comments/Activity" },
    { key: "claims", label: "Insurance Claims" },
    { key: "audit", label: "Linked Audit Entries" },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ops-section-title">Incidents</p>
          <h2 className="text-lg font-semibold md:text-xl">{String(incident.incident_number ?? `INC-${incidentId}`)}</h2>
          <p className="text-sm text-muted-foreground">
            {String(incident.type ?? "-")} · {String(incident.severity ?? "-")} · {String(incident.status ?? "-")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option value="acknowledged">acknowledged</option>
            <option value="investigating">investigating</option>
            <option value="resolved">resolved</option>
            <option value="closed">closed</option>
          </select>
          <button type="button" onClick={() => statusMutation.mutate()} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
            {statusMutation.isPending ? "Updating..." : "Transition Status"}
          </button>
          <Link href="/incidents" className="rounded-lg border border-border px-3 py-2 text-sm">
            Back to Incidents
          </Link>
        </div>
      </div>

      <section className="ops-card p-2">
        <div className="flex flex-wrap gap-2">
          {tabButtons.map((tab) => (
            <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`rounded-lg border px-3 py-2 text-sm ${activeTab === tab.key ? "border-primary/40 bg-primary/15 text-foreground" : "border-border text-muted-foreground"}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {incidentQuery.isLoading ? <div className="ops-card p-6 text-sm text-muted-foreground">Loading incident detail...</div> : null}
      {incidentQuery.isError ? <div className="ops-card p-6 text-sm text-rose-300">Unable to load incident detail.</div> : null}

      {!incidentQuery.isLoading && !incidentQuery.isError ? (
        <>
          {activeTab === "summary" ? (
            <section className="ops-card p-4">
              <h3 className="mb-2 text-sm font-semibold">Summary</h3>
              <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                <p>Type: <span className="text-muted-foreground">{String(incident.type ?? "-")}</span></p>
                <p>Severity: <span className="text-muted-foreground">{String(incident.severity ?? "-")}</span></p>
                <p>Status: <span className="text-muted-foreground">{String(incident.status ?? "-")}</span></p>
                <p>Vehicle: <span className="text-muted-foreground">{String(incident.vehicle_name ?? incident.vehicle_id ?? "-")}</span></p>
                <p>Driver: <span className="text-muted-foreground">{String(incident.driver_name ?? incident.driver_id ?? "-")}</span></p>
                <p>Trip: <span className="text-muted-foreground">{String(incident.trip_id ?? "-")}</span></p>
                <p>Reported At: <span className="text-muted-foreground">{String(incident.reported_at ?? incident.created_at ?? "-")}</span></p>
                <p>Investigator: <span className="text-muted-foreground">{String(incident.investigator_name ?? incident.investigator_id ?? "-")}</span></p>
                <p className="md:col-span-2">Root Cause: <span className="text-muted-foreground">{String(incident.root_cause ?? "-")}</span></p>
                <p className="md:col-span-2">Corrective Action: <span className="text-muted-foreground">{String(incident.corrective_action ?? "-")}</span></p>
                <p className="md:col-span-2">Preventive Action: <span className="text-muted-foreground">{String(incident.preventive_action ?? "-")}</span></p>
              </div>
            </section>
          ) : null}

          {activeTab === "evidence" ? (
            <section className="ops-card p-4">
              <h3 className="mb-2 text-sm font-semibold">Evidence</h3>
              {Array.isArray(incident.evidence) && incident.evidence.length > 0 ? (
                <div className="space-y-2">
                  {(incident.evidence as Array<Record<string, unknown>>).map((item, idx) => (
                    <div key={idx} className="rounded border border-border p-3 text-sm">
                      <p className="font-medium text-foreground">{String(item.title ?? item.type ?? "Evidence")}</p>
                      <p className="text-xs text-muted-foreground">{String(item.description ?? "-")}</p>
                      {item.file_url ? <a href={String(item.file_url)} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Open file</a> : null}
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No evidence attached.</p>}
            </section>
          ) : null}

          {activeTab === "witnesses" ? (
            <section className="ops-card p-4">
              <h3 className="mb-2 text-sm font-semibold">Witnesses</h3>
              {Array.isArray(incident.witnesses) && incident.witnesses.length > 0 ? (
                <div className="space-y-2">
                  {(incident.witnesses as Array<Record<string, unknown>>).map((w, idx) => (
                    <div key={idx} className="rounded border border-border p-3 text-sm">
                      <p className="font-medium text-foreground">{String(w.name ?? `Witness ${idx + 1}`)}</p>
                      <p className="text-xs text-muted-foreground">{String(w.statement ?? "-")}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No witnesses captured.</p>}
            </section>
          ) : null}

          {activeTab === "activity" ? (
            <section className="ops-card p-4">
              <h3 className="mb-2 text-sm font-semibold">Comments / Activity</h3>
              {Array.isArray(incident.comments) && incident.comments.length > 0 ? (
                <div className="space-y-2">
                  {(incident.comments as Array<Record<string, unknown>>).map((c, idx) => (
                    <div key={idx} className="rounded border border-border p-3 text-sm">
                      <p className="font-medium text-foreground">{String(c.author ?? c.user_name ?? "User")}</p>
                      <p className="text-xs text-muted-foreground">{String(c.comment ?? c.message ?? "-")}</p>
                      <p className="text-[11px] text-muted-foreground">{String(c.created_at ?? "-")}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No activity yet.</p>}
            </section>
          ) : null}

          {activeTab === "claims" ? (
            <section className="ops-card p-4">
              <h3 className="mb-2 text-sm font-semibold">Insurance Claims</h3>
              {claims.length === 0 ? <p className="text-sm text-muted-foreground">No claims linked.</p> : (
                <div className="space-y-2">
                  {claims.map((claim, idx) => (
                    <div key={idx} className="rounded border border-border p-3 text-sm">
                      <p className="font-medium text-foreground">{String(claim.claim_number ?? `Claim ${idx + 1}`)}</p>
                      <p className="text-xs text-muted-foreground">
                        Claimed {String(claim.claimed_amount ?? "-")} · Approved {String(claim.approved_amount ?? "-")} · Status {String(claim.status ?? "-")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : null}

          {activeTab === "audit" ? (
            <section className="ops-card p-4">
              <h3 className="mb-2 text-sm font-semibold">Linked Audit Entries</h3>
              {auditQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading audit entries...</p> : null}
              {auditQuery.isError ? <p className="text-sm text-rose-300">Unable to load audit entries.</p> : null}
              {!auditQuery.isLoading && !auditQuery.isError && (auditQuery.data?.items?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No audit entries linked.</p>
              ) : null}
              <div className="space-y-2">
                {(auditQuery.data?.items ?? []).map((item, idx) => {
                  const row = item as Record<string, unknown>;
                  return (
                    <div key={idx} className="rounded border border-border p-3 text-sm">
                      <p className="font-medium text-foreground">{String(row.action_type ?? row.action ?? "-")}</p>
                      <p className="text-xs text-muted-foreground">
                        {String(row.actor ?? row.user_name ?? "system")} · {String(row.created_at ?? row.timestamp ?? "-")}
                      </p>
                      <p className="text-xs text-muted-foreground">{String(row.description ?? row.notes ?? "-")}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
