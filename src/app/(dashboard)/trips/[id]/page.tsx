"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import GoogleMap from "@/components/maps/GoogleMap";
import TripStatusBadge from "@/components/trips/TripStatusBadge";
import { fetchTrip } from "@/lib/api/trips";
import { fetchPreTrip } from "@/lib/api/pretrip";
import {
  confirmPreTrip,
  updateFuelAllocation,
  updateRoadExpense,
  uploadRoadExpenseReceipt,
  verifyPreTrip,
} from "@/lib/api/logistics";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";

const tabs = ["overview", "inspection", "evidence", "expenses", "audit"] as const;

type TabKey = (typeof tabs)[number];
type ChecklistStatus = "pass" | "fail" | "na";

function normalizeChecklistStatus(value: unknown): ChecklistStatus | null {
  if (value === true) return "pass";
  if (value === false) return "fail";
  if (typeof value !== "string") return null;

  const normalized = value.toLowerCase();
  if (["pass", "ok", "yes"].includes(normalized)) return "pass";
  if (["fail", "failed", "no"].includes(normalized)) return "fail";
  if (["na", "n/a", "not_applicable"].includes(normalized)) return "na";
  return null;
}

function toneClass(tone: "default" | "success" | "warning" | "danger" | "info") {
  if (tone === "success") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
  if (tone === "warning") return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  if (tone === "danger") return "border-rose-500/30 bg-rose-500/12 text-rose-300";
  if (tone === "info") return "border-indigo-500/25 bg-indigo-500/10 text-indigo-300";
  return "border-border bg-card text-muted-foreground";
}

function DetailBadge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold",
        toneClass(tone)
      )}
    >
      {children}
    </span>
  );
}

function Section({ title, subtitle, children, right }: { title: string; subtitle?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="ops-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export default function TripDetailPage() {
  const params = useParams();
  const tripId = String(params?.id ?? "");
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<TabKey>("overview");
  const [checklistFilter, setChecklistFilter] = useState<"all" | "fail" | "blocker">("all");
  const [verifyStatus, setVerifyStatus] = useState<"approved" | "rejected">("approved");
  const [verifyNote, setVerifyNote] = useState("");
  const [fuelDraft, setFuelDraft] = useState({
    fuel_allocated_litres: "",
    fuel_allocation_station: "",
    fuel_allocation_payment_mode: "cash",
    fuel_allocation_reference: "",
    fuel_allocation_note: "",
  });
  const [roadDraft, setRoadDraft] = useState({
    road_expense_disbursed: false,
    road_expense_reference: "",
    road_expense_payment_status: "pending",
    road_expense_payment_method: "cash",
    road_expense_payment_reference: "",
    road_expense_note: "",
  });

  const { data: trip, isLoading, isError } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => fetchTrip(tripId),
    enabled: Boolean(tripId),
    refetchInterval: 20_000,
  });

  const { data: preTrip } = useQuery({
    queryKey: ["trip", tripId, "pre_trip"],
    queryFn: () => fetchPreTrip(tripId),
    enabled: Boolean(tripId),
    retry: false,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const verifyMutation = useMutation({
    mutationFn: () => verifyPreTrip(Number(tripId), { status: verifyStatus, note: verifyNote || undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trip", tripId, "pre_trip"] }),
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirmPreTrip(Number(tripId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trip", tripId, "pre_trip"] }),
  });

  const fuelMutation = useMutation({
    mutationFn: () =>
      updateFuelAllocation(Number(tripId), {
        fuel_allocated_litres: fuelDraft.fuel_allocated_litres || trip?.fuel_allocated_litres || null,
        fuel_allocation_station: fuelDraft.fuel_allocation_station || trip?.fuel_allocation_station || null,
        fuel_allocation_payment_mode:
          fuelDraft.fuel_allocation_payment_mode || trip?.fuel_allocation_payment_mode || "cash",
        fuel_allocation_reference: fuelDraft.fuel_allocation_reference || trip?.fuel_allocation_reference || null,
        fuel_allocation_note: fuelDraft.fuel_allocation_note || trip?.fuel_allocation_note || null,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trip", tripId] }),
  });

  const roadMutation = useMutation({
    mutationFn: () =>
      updateRoadExpense(Number(tripId), {
        road_expense_disbursed: roadDraft.road_expense_disbursed,
        road_expense_reference: roadDraft.road_expense_reference || trip?.road_expense_reference || null,
        road_expense_payment_status:
          roadDraft.road_expense_payment_status || trip?.road_expense_payment_status || "pending",
        road_expense_payment_method:
          roadDraft.road_expense_payment_method || trip?.road_expense_payment_method || "cash",
        road_expense_payment_reference:
          roadDraft.road_expense_payment_reference || trip?.road_expense_payment_reference || null,
        road_expense_note: roadDraft.road_expense_note || trip?.road_expense_note || null,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trip", tripId] }),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadRoadExpenseReceipt(Number(tripId), file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trip", tripId] }),
  });

  const checklistRows = useMemo(() => {
    const template = preTrip?.core_checklist_template ?? [];
    const values = preTrip?.core_checklist ?? {};

    return template.map((item) => {
      const raw = values[item.code];
      const objectValue =
        raw && typeof raw === "object" && !Array.isArray(raw)
          ? (raw as { status?: string | null; note?: string | null })
          : null;
      const status = normalizeChecklistStatus(objectValue?.status ?? raw);
      const note = objectValue?.note?.trim() || "";
      const isBlocker = item.severity_on_fail === "blocker";
      return {
        ...item,
        status,
        note,
        isFailure: status === "fail",
        isBlockerFailure: status === "fail" && isBlocker,
      };
    });
  }, [preTrip?.core_checklist, preTrip?.core_checklist_template]);

  const filteredChecklist = useMemo(() => {
    if (checklistFilter === "fail") return checklistRows.filter((i) => i.isFailure);
    if (checklistFilter === "blocker") return checklistRows.filter((i) => i.isBlockerFailure);
    return checklistRows;
  }, [checklistFilter, checklistRows]);

  const groupedChecklist = useMemo(() => {
    const map = new Map<string, typeof filteredChecklist>();
    filteredChecklist.forEach((row) => {
      const section = row.section || "General";
      const list = map.get(section) ?? [];
      map.set(section, [...list, row]);
    });
    return Array.from(map.entries());
  }, [filteredChecklist]);

  const evidence = useMemo(() => {
    const proofUrl = trip?.proof_of_fuelling_url ?? trip?.proof_of_fueling_url ?? trip?.proofOfFuellingUrl;
    return [
      { label: "Odometer Start", url: trip?.start_odometer_photo_url },
      { label: "Odometer End", url: trip?.end_odometer_photo_url },
      { label: "Waybill", url: preTrip?.waybill_photo_url },
      { label: "Load", url: preTrip?.load_photo_url },
      { label: "Inspector Signature", url: trip?.inspector_signature_url ?? preTrip?.inspector_signature_url },
      { label: "Fuel Proof", url: proofUrl },
    ];
  }, [preTrip, trip]);

  if (isLoading) {
    return <div className="ops-card p-8 text-sm text-muted-foreground">Loading trip details...</div>;
  }

  if (isError || !trip) {
    return (
      <div className="ops-card p-8 text-sm text-rose-300">
        Unable to load trip detail.
      </div>
    );
  }

  const failCount = checklistRows.filter((r) => r.isFailure).length;
  const blockerCount = checklistRows.filter((r) => r.isBlockerFailure).length;

  return (
    <div className="space-y-4">
      <header className="ops-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-sm font-bold text-foreground">
                {trip.reference_code ?? `TRIP-${trip.id}`}
              </h1>
              <TripStatusBadge status={trip.status} />
              {blockerCount > 0 ? <DetailBadge tone="danger">Blocker</DetailBadge> : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {(trip.pickup_location ?? "Origin")} → {(trip.destination ?? trip.dropoff_location ?? "Destination")}
              {trip.delivery_address ? ` · ${trip.delivery_address}` : ""}
            </p>
          </div>

          <div className="flex gap-2">
            <Link href={`/trips/${trip.id}/edit`} className="rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
              Edit
            </Link>
            <Link href={`/trip-chats/${trip.id}`} className="rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
              Chat
            </Link>
            {trip.delivery_map_url ? (
              <a
                href={trip.delivery_map_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground"
              >
                Map
              </a>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-5">
          <DetailBadge tone="info">Scheduled: {formatDate(trip.scheduled_pickup_at ?? trip.trip_date ?? undefined)}</DetailBadge>
          <DetailBadge tone="success">Driver: {trip.driver?.name ?? "Unassigned"}</DetailBadge>
          <DetailBadge>Vehicle: {trip.vehicle?.name ?? trip.truck_reg_no ?? "-"}</DetailBadge>
          <DetailBadge tone="warning">Failed Checks: {failCount}</DetailBadge>
          <DetailBadge tone={trip.road_expense_payment_status === "rejected" ? "danger" : "default"}>
            Expense: {trip.road_expense_payment_status ?? "pending"}
          </DetailBadge>
        </div>
      </header>

      <div className="flex gap-2 border-b border-border pb-2">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
              tab === t ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-card"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {tab === "overview" ? (
            <>
              <Section title="Timeline" subtitle="Latest trip events">
                {trip.events?.length ? (
                  <div className="space-y-2">
                    {[...trip.events]
                      .sort((a, b) => (new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()))
                      .slice(0, 12)
                      .map((e) => (
                        <div key={e.id} className="rounded-md border border-border bg-card p-2">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm text-foreground">{e.message || e.event_type}</p>
                            <span className="font-mono text-[11px] text-muted-foreground">{formatDate(e.created_at ?? undefined)}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No timeline events found yet.</p>
                )}
              </Section>

              {trip.latest_location ? (
                <Section title="Live Location" subtitle="Latest coordinates from tracking">
                  <GoogleMap coords={{ lat: trip.latest_location.lat, lng: trip.latest_location.lng }} />
                </Section>
              ) : null}
            </>
          ) : null}

          {tab === "inspection" ? (
            <Section
              title="Inspection Checklist"
              subtitle="Pre-trip checklist grouped by section"
              right={
                <div className="flex gap-2">
                  <button type="button" onClick={() => setChecklistFilter("all")} className={cn("rounded px-2 py-1 text-[11px]", checklistFilter === "all" ? "bg-primary/20 text-primary" : "text-muted-foreground")}>All</button>
                  <button type="button" onClick={() => setChecklistFilter("fail")} className={cn("rounded px-2 py-1 text-[11px]", checklistFilter === "fail" ? "bg-amber-500/20 text-amber-300" : "text-muted-foreground")}>Failed</button>
                  <button type="button" onClick={() => setChecklistFilter("blocker")} className={cn("rounded px-2 py-1 text-[11px]", checklistFilter === "blocker" ? "bg-rose-500/20 text-rose-300" : "text-muted-foreground")}>Blockers</button>
                </div>
              }
            >
              {groupedChecklist.length ? (
                <div className="space-y-3">
                  {groupedChecklist.map(([section, rows]) => (
                    <div key={section}>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{section}</p>
                      <div className="space-y-2">
                        {rows.map((row) => (
                          <div key={row.code} className={cn("rounded-md border p-2", row.isFailure ? "border-rose-500/30 bg-rose-500/10" : "border-border bg-card")}>
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm text-foreground">{row.label}</p>
                              <DetailBadge tone={row.isBlockerFailure ? "danger" : row.isFailure ? "warning" : "success"}>
                                {row.status ?? "n/a"}
                              </DetailBadge>
                            </div>
                            {row.note ? <p className="mt-1 text-xs text-muted-foreground">{row.note}</p> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No checklist data available.</p>
              )}
            </Section>
          ) : null}

          {tab === "evidence" ? (
            <Section title="Evidence" subtitle="Photos and signatures attached to this trip">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {evidence.map((item) => (
                  <div key={item.label} className="rounded-md border border-border bg-card p-2">
                    <p className="mb-1 text-xs font-semibold text-foreground">{item.label}</p>
                    {item.url ? (
                      <a href={item.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                        Open file
                      </a>
                    ) : (
                      <p className="text-xs text-muted-foreground">Not uploaded</p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {tab === "expenses" ? (
            <Section title="Fuel & Road Expense" subtitle="Financial details for this trip">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Fuel Allocated</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{trip.fuel_allocated_litres ?? "-"} L</p>
                  <p className="mt-1 text-xs text-muted-foreground">Station: {trip.fuel_allocation_station ?? "-"}</p>
                </div>
                <div className="rounded-md border border-border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Road Expense Status</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{trip.road_expense_payment_status ?? "pending"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Reference: {trip.road_expense_reference ?? "-"}</p>
                </div>
              </div>
            </Section>
          ) : null}

          {tab === "audit" ? (
            <Section title="Audit Trail" subtitle="Recent events and action history">
              {trip.events?.length ? (
                <div className="space-y-2">
                  {[...trip.events]
                    .sort((a, b) => (new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()))
                    .map((event) => (
                      <div key={event.id} className="flex items-center justify-between rounded-md border border-border bg-card p-2">
                        <div>
                          <p className="text-sm text-foreground">{event.message || event.event_type}</p>
                          <p className="text-xs text-muted-foreground">Event: {event.event_type}</p>
                        </div>
                        <p className="font-mono text-xs text-muted-foreground">{formatDate(event.created_at ?? undefined)}</p>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No audit events captured.</p>
              )}
            </Section>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Section title="Verification Actions" subtitle="Pre-trip decision controls">
            <div className="space-y-3">
              <label className="block text-xs text-muted-foreground">
                Verification status
                <select
                  value={verifyStatus}
                  onChange={(e) => setVerifyStatus(e.target.value as "approved" | "rejected")}
                  className="mt-1 w-full rounded-md border border-border bg-card px-2 py-2 text-sm"
                >
                  <option value="approved">Approve</option>
                  <option value="rejected">Reject</option>
                </select>
              </label>
              <label className="block text-xs text-muted-foreground">
                Note
                <textarea
                  value={verifyNote}
                  onChange={(e) => setVerifyNote(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-border bg-card px-2 py-2 text-sm"
                />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => verifyMutation.mutate()}
                  disabled={verifyMutation.isPending || !preTrip}
                  className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-300 disabled:opacity-50"
                >
                  {verifyMutation.isPending ? "Verifying..." : "Verify"}
                </button>
                <button
                  type="button"
                  onClick={() => confirmMutation.mutate()}
                  disabled={confirmMutation.isPending || !preTrip}
                  className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 disabled:opacity-50"
                >
                  {confirmMutation.isPending ? "Confirming..." : "Confirm"}
                </button>
              </div>
            </div>
          </Section>

          <Section title="Fuel Allocation" subtitle="Update logistics fuel values">
            <div className="space-y-2">
              <input
                placeholder={String(trip.fuel_allocated_litres ?? "Allocated litres")}
                value={fuelDraft.fuel_allocated_litres}
                onChange={(e) => setFuelDraft((p) => ({ ...p, fuel_allocated_litres: e.target.value }))}
                className="w-full rounded-md border border-border bg-card px-2 py-2 text-sm"
              />
              <input
                placeholder={trip.fuel_allocation_station ?? "Fuel station"}
                value={fuelDraft.fuel_allocation_station}
                onChange={(e) => setFuelDraft((p) => ({ ...p, fuel_allocation_station: e.target.value }))}
                className="w-full rounded-md border border-border bg-card px-2 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => fuelMutation.mutate()}
                disabled={fuelMutation.isPending}
                className="w-full rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-300 disabled:opacity-50"
              >
                {fuelMutation.isPending ? "Updating..." : "Save Fuel"}
              </button>
            </div>
          </Section>

          <Section title="Road Expense" subtitle="Update payout and receipt">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={roadDraft.road_expense_disbursed}
                  onChange={(e) => setRoadDraft((p) => ({ ...p, road_expense_disbursed: e.target.checked }))}
                />
                Expense disbursed
              </label>
              <input
                placeholder={trip.road_expense_reference ?? "Expense reference"}
                value={roadDraft.road_expense_reference}
                onChange={(e) => setRoadDraft((p) => ({ ...p, road_expense_reference: e.target.value }))}
                className="w-full rounded-md border border-border bg-card px-2 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => roadMutation.mutate()}
                disabled={roadMutation.isPending}
                className="w-full rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 disabled:opacity-50"
              >
                {roadMutation.isPending ? "Updating..." : "Save Expense"}
              </button>
              <label className="block rounded-md border border-dashed border-border p-2 text-xs text-muted-foreground">
                Upload receipt
                <input
                  type="file"
                  className="mt-1 block w-full"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadMutation.mutate(file);
                  }}
                />
              </label>
            </div>
          </Section>
        </aside>
      </div>
    </div>
  );
}
