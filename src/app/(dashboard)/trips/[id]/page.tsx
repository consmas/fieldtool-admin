"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import GoogleMap from "@/components/maps/GoogleMap";
import TripStatusBadge from "@/components/trips/TripStatusBadge";
import TripWorkflowSteps from "@/components/trips/TripWorkflowSteps";
import { fetchOmcBalances } from "@/lib/api/fuel_analytics";
import { fetchTrip } from "@/lib/api/trips";
import {
  confirmPreTripInspection,
  createPreTrip,
  fetchPreTrip,
  updatePreTrip,
  verifyPreTripInspection,
} from "@/lib/api/pretrip";
import {
  updateFuelAllocation,
  updateRoadExpense,
  uploadRoadExpenseReceipt,
} from "@/lib/api/logistics";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";
import type { PreTripInspection, Trip } from "@/types/api";

const tabs = [
  { key: "overview", label: "Overview" },
  { key: "dispatch", label: "Dispatch" },
  { key: "documents", label: "Documents" },
  { key: "money", label: "Money" },
  { key: "activity", label: "Activity" },
] as const;

type TabKey = (typeof tabs)[number]["key"];
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

type ChecklistStatusOption = "pass" | "fail" | "na" | "";
type ChecklistItem = {
  code: string;
  label: string;
  severity: "blocker" | "warning";
  section: string;
};

const CORE_CHECKLIST_ITEMS: ChecklistItem[] = [
  { code: "vehicle_exterior.lights_indicators_working", label: "Lights & indicators", severity: "blocker", section: "Vehicle Exterior" },
  { code: "vehicle_exterior.mirrors_windscreen_ok", label: "Mirrors & windscreen", severity: "warning", section: "Vehicle Exterior" },
  { code: "vehicle_exterior.license_plate_visible", label: "License plate visible", severity: "blocker", section: "Vehicle Exterior" },
  { code: "vehicle_exterior.no_major_body_damage", label: "No major body damage", severity: "warning", section: "Vehicle Exterior" },
  { code: "tyres.pressure_all_wheels_ok", label: "Tyre pressure all wheels", severity: "blocker", section: "Tyres" },
  { code: "tyres.tread_depth_ok", label: "Tread depth", severity: "blocker", section: "Tyres" },
  { code: "tyres.no_cuts_bulges_exposed_cord", label: "No tyre cuts/bulges/exposed cord", severity: "blocker", section: "Tyres" },
  { code: "tyres.wheel_nuts_secure", label: "Wheel nuts secure", severity: "blocker", section: "Tyres" },
  { code: "brakes.service_brake_ok", label: "Service brake", severity: "blocker", section: "Brakes" },
  { code: "brakes.parking_brake_ok", label: "Parking brake", severity: "blocker", section: "Brakes" },
  { code: "brakes.air_or_brake_warning_clear", label: "Brake warning clear", severity: "blocker", section: "Brakes" },
  { code: "steering.steering_response_ok", label: "Steering response", severity: "blocker", section: "Steering" },
  { code: "engine.engine_oil_level_ok", label: "Engine oil level", severity: "blocker", section: "Engine" },
  { code: "engine.coolant_level_ok", label: "Coolant level", severity: "blocker", section: "Engine" },
  { code: "engine.brake_fluid_level_ok", label: "Brake fluid level", severity: "blocker", section: "Engine" },
  { code: "engine.no_active_leaks", label: "No active leaks", severity: "blocker", section: "Engine" },
  { code: "coupling.kingpin_or_hitch_locked", label: "Kingpin/hitch locked", severity: "blocker", section: "Coupling" },
  { code: "coupling.air_electrical_lines_connected", label: "Air/electrical lines connected", severity: "blocker", section: "Coupling" },
  { code: "coupling.trailer_lights_working", label: "Trailer lights", severity: "blocker", section: "Coupling" },
  { code: "coupling.trailer_legs_raised_locked", label: "Trailer legs raised/locked", severity: "blocker", section: "Coupling" },
  { code: "safety.fire_extinguisher_present_charged", label: "Fire extinguisher present/charged", severity: "blocker", section: "Safety" },
  { code: "safety.warning_triangles_present", label: "Warning triangles present", severity: "blocker", section: "Safety" },
  { code: "safety.first_aid_kit_present", label: "First aid kit present", severity: "warning", section: "Safety" },
  { code: "safety.seatbelt_driver_ok", label: "Driver seatbelt", severity: "blocker", section: "Safety" },
  { code: "docs.driver_license_valid", label: "Driver license valid", severity: "blocker", section: "Docs" },
  { code: "docs.vehicle_registration_present", label: "Vehicle registration present", severity: "blocker", section: "Docs" },
  { code: "docs.insurance_or_roadworthy_valid", label: "Insurance/roadworthy valid", severity: "blocker", section: "Docs" },
  { code: "docs.waybill_present", label: "Waybill present", severity: "blocker", section: "Docs" },
  { code: "load.load_area_ready", label: "Load area ready", severity: "blocker", section: "Load" },
  { code: "load.load_secured", label: "Load secured", severity: "blocker", section: "Load" },
  { code: "load.weight_within_limit", label: "Weight within limit", severity: "blocker", section: "Load" },
];

type ChecklistValue = { status: ChecklistStatusOption; note: string };

function buildChecklistState(coreChecklist: PreTripInspection["core_checklist"]) {
  const next: Record<string, ChecklistValue> = {};
  CORE_CHECKLIST_ITEMS.forEach((item) => {
    const raw = coreChecklist?.[item.code];
    let status: ChecklistStatusOption = "";
    let note = "";
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      status = normalizeChecklistStatus((raw as { status?: string | null }).status) ?? "";
      note = String((raw as { note?: string | null }).note ?? "");
    } else {
      status = normalizeChecklistStatus(raw) ?? "";
    }
    next[item.code] = { status, note };
  });
  return next;
}

function buildPreTripFormData(params: {
  values: Record<string, string | boolean>;
  files: Record<string, File | null>;
  checklistJson: string;
}) {
  const fd = new FormData();
  const append = (key: string, value: string | boolean | null | undefined) => {
    if (value === undefined || value === null || value === "") return;
    fd.append(`pre_trip[${key}]`, String(value));
  };

  append("brakes", params.values.brakes);
  append("tyres", params.values.tyres);
  append("lights", params.values.lights);
  append("mirrors", params.values.mirrors);
  append("horn", params.values.horn);
  append("fuel_sufficient", params.values.fuel_sufficient);
  append("odometer_value_km", params.values.odometer_value_km);
  append("odometer_captured_at", params.values.odometer_captured_at);
  append("load_status", params.values.load_status);
  append("load_area_ready", params.values.load_area_ready);
  append("load_secured", params.values.load_secured);
  append("load_note", params.values.load_note);
  append("accepted", params.values.accepted);
  append("accepted_at", params.values.accepted_at);
  append("waybill_number", params.values.waybill_number);
  append("assistant_name", params.values.assistant_name);
  append("assistant_phone", params.values.assistant_phone);
  append("fuel_level", params.values.fuel_level);

  if (params.checklistJson.trim()) {
    fd.append("pre_trip[core_checklist_json]", params.checklistJson);
  }

  Object.entries(params.files).forEach(([key, file]) => {
    if (!file) return;
    fd.append(`pre_trip[${key}]`, file);
  });
  return fd;
}

function toLocalDateTimeInput(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function PreTripCard({
  tripId,
  trip,
  preTrip,
  onRefresh,
}: {
  tripId: number;
  trip: Trip;
  preTrip: PreTripInspection | null;
  onRefresh: () => Promise<void>;
}) {
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<"approved" | "rejected">("approved");
  const [verifyNote, setVerifyNote] = useState("");
  const [form, setForm] = useState<Record<string, string | boolean>>({
    brakes: preTrip?.brakes ?? false,
    tyres: preTrip?.tyres ?? false,
    lights: preTrip?.lights ?? false,
    mirrors: preTrip?.mirrors ?? false,
    horn: preTrip?.horn ?? false,
    fuel_sufficient: preTrip?.fuel_sufficient ?? false,
    odometer_value_km: String(preTrip?.odometer_value_km ?? ""),
    odometer_captured_at:
      String(preTrip?.odometer_captured_at ?? "").slice(0, 16) ||
      toLocalDateTimeInput(trip.trip_date ?? trip.scheduled_pickup_at ?? null),
    load_status: String(preTrip?.load_status ?? "full"),
    load_area_ready: preTrip?.load_area_ready ?? false,
    load_secured: preTrip?.load_secured ?? false,
    load_note: String(preTrip?.load_note ?? ""),
    accepted: preTrip?.accepted ?? false,
    accepted_at:
      String(preTrip?.accepted_at ?? "").slice(0, 16) ||
      toLocalDateTimeInput(trip.trip_date ?? trip.scheduled_pickup_at ?? null),
    waybill_number: String(preTrip?.waybill_number ?? trip.waybill_number ?? ""),
    assistant_name: String(preTrip?.assistant_name ?? ""),
    assistant_phone: String(preTrip?.assistant_phone ?? ""),
    fuel_level: String(preTrip?.fuel_level ?? ""),
  });
  const [checklist, setChecklist] = useState<Record<string, ChecklistValue>>(
    buildChecklistState(preTrip?.core_checklist ?? null)
  );
  const [files, setFiles] = useState<Record<string, File | null>>({
    odometer_photo: null,
    load_photo: null,
    waybill_photo: null,
    inspector_signature: null,
    inspector_photo: null,
  });
  const uploadFields: Array<{
    key: "odometer_photo" | "load_photo" | "waybill_photo" | "inspector_signature" | "inspector_photo";
    label: string;
    url?: string | null;
  }> = [
    { key: "odometer_photo", label: "Odometer Photo", url: preTrip?.odometer_photo_url },
    { key: "load_photo", label: "Load Photo", url: preTrip?.load_photo_url },
    { key: "waybill_photo", label: "Waybill Photo", url: preTrip?.waybill_photo_url },
    { key: "inspector_signature", label: "Inspector Signature", url: preTrip?.inspector_signature_url },
    {
      key: "inspector_photo",
      label: "Inspector Photo",
      url: (preTrip as PreTripInspection & { inspector_photo_url?: string | null } | null)?.inspector_photo_url,
    },
  ];

  useEffect(() => {
    setForm({
      brakes: preTrip?.brakes ?? false,
      tyres: preTrip?.tyres ?? false,
      lights: preTrip?.lights ?? false,
      mirrors: preTrip?.mirrors ?? false,
      horn: preTrip?.horn ?? false,
      fuel_sufficient: preTrip?.fuel_sufficient ?? false,
      odometer_value_km: String(preTrip?.odometer_value_km ?? ""),
      odometer_captured_at:
        String(preTrip?.odometer_captured_at ?? "").slice(0, 16) ||
        toLocalDateTimeInput(trip.trip_date ?? trip.scheduled_pickup_at ?? null),
      load_status: String(preTrip?.load_status ?? "full"),
      load_area_ready: preTrip?.load_area_ready ?? false,
      load_secured: preTrip?.load_secured ?? false,
      load_note: String(preTrip?.load_note ?? ""),
      accepted: preTrip?.accepted ?? false,
      accepted_at:
        String(preTrip?.accepted_at ?? "").slice(0, 16) ||
        toLocalDateTimeInput(trip.trip_date ?? trip.scheduled_pickup_at ?? null),
      waybill_number: String(preTrip?.waybill_number ?? trip.waybill_number ?? ""),
      assistant_name: String(preTrip?.assistant_name ?? ""),
      assistant_phone: String(preTrip?.assistant_phone ?? ""),
      fuel_level: String(preTrip?.fuel_level ?? ""),
    });
    setChecklist(buildChecklistState(preTrip?.core_checklist ?? null));
  }, [preTrip, trip.scheduled_pickup_at, trip.trip_date, trip.waybill_number]);

  const requiredChecksPassed = Boolean(
    form.brakes &&
      form.tyres &&
      form.lights &&
      form.mirrors &&
      form.horn &&
      form.fuel_sufficient &&
      String(form.odometer_value_km || "").trim().length > 0
  );
  const hasBlockingChecklistFailure = CORE_CHECKLIST_ITEMS.some(
    (item) => item.severity === "blocker" && checklist[item.code]?.status !== "pass"
  );
  const checklistJson = useMemo(() => {
    const obj: Record<string, { status: ChecklistStatusOption; note?: string }> = {};
    CORE_CHECKLIST_ITEMS.forEach((item) => {
      const value = checklist[item.code];
      obj[item.code] = {
        status: value?.status ?? "",
        note: value?.note || undefined,
      };
    });
    return JSON.stringify(obj);
  }, [checklist]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPreTripFormData({ values: form, files, checklistJson });
      if (preTrip?.id) return updatePreTrip(tripId, payload);
      return createPreTrip(tripId, payload);
    },
    onSuccess: async () => {
      setMessage({ tone: "success", text: "Pre-trip saved." });
      await onRefresh();
    },
    onError: (error: unknown) => {
      const err = error as {
        response?: { status?: number; data?: { message?: string; errors?: Record<string, string[] | string> } };
      };
      const fieldError = err.response?.data?.errors
        ? Object.entries(err.response.data.errors)[0]?.[1]
        : null;
      const text = Array.isArray(fieldError)
        ? fieldError[0]
        : typeof fieldError === "string"
        ? fieldError
        : err.response?.data?.message ||
          (err.response?.status ? `Unable to save pre-trip (HTTP ${err.response.status}).` : "Unable to save pre-trip.");
      setMessage({ tone: "error", text });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () => verifyPreTripInspection(tripId, { status: verifyStatus, note: verifyNote || undefined }),
    onSuccess: async () => {
      setMessage({ tone: "success", text: "Pre-trip verified." });
      await onRefresh();
    },
    onError: () => setMessage({ tone: "error", text: "Unable to verify pre-trip." }),
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirmPreTripInspection(tripId),
    onSuccess: async () => {
      setMessage({ tone: "success", text: "Pre-trip confirmed." });
      await onRefresh();
    },
    onError: () => setMessage({ tone: "error", text: "Unable to confirm pre-trip." }),
  });

  return (
    <Section title="Pre-Trip Inspection" subtitle="Create, update, verify and confirm pre-trip data">
      <div className="grid gap-3 md:grid-cols-3">
        {[
          ["brakes", "Brakes"],
          ["tyres", "Tyres"],
          ["lights", "Lights"],
          ["mirrors", "Mirrors"],
          ["horn", "Horn"],
          ["fuel_sufficient", "Fuel Sufficient"],
          ["load_area_ready", "Load Area Ready"],
          ["load_secured", "Load Secured"],
          ["accepted", "Accepted"],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={Boolean(form[key])}
              onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.checked }))}
            />
            {label}
          </label>
        ))}
        <input placeholder="Odometer Value (km)" value={String(form.odometer_value_km)} onChange={(e) => setForm((p) => ({ ...p, odometer_value_km: e.target.value }))} className="rounded-md border border-border bg-card px-2 py-2 text-sm md:col-span-1" />
        <input type="datetime-local" value={String(form.odometer_captured_at)} onChange={(e) => setForm((p) => ({ ...p, odometer_captured_at: e.target.value }))} className="rounded-md border border-border bg-card px-2 py-2 text-sm md:col-span-1" />
        <select
          value={String(form.load_status)}
          onChange={(e) => setForm((p) => ({ ...p, load_status: e.target.value }))}
          className="rounded-md border border-border bg-card px-2 py-2 text-sm"
        >
          <option value="">Load Status</option>
          <option value="full">full</option>
          <option value="partial">partial</option>
        </select>
        <textarea placeholder="Load Note" value={String(form.load_note)} onChange={(e) => setForm((p) => ({ ...p, load_note: e.target.value }))} className="rounded-md border border-border bg-card px-2 py-2 text-sm md:col-span-2" />
        <input type="datetime-local" value={String(form.accepted_at)} onChange={(e) => setForm((p) => ({ ...p, accepted_at: e.target.value }))} className="rounded-md border border-border bg-card px-2 py-2 text-sm" />
        <input placeholder="Waybill Number" value={String(form.waybill_number)} onChange={(e) => setForm((p) => ({ ...p, waybill_number: e.target.value }))} className="rounded-md border border-border bg-card px-2 py-2 text-sm" />
        <input placeholder="Assistant Name" value={String(form.assistant_name)} onChange={(e) => setForm((p) => ({ ...p, assistant_name: e.target.value }))} className="rounded-md border border-border bg-card px-2 py-2 text-sm" />
        <input placeholder="Assistant Phone" value={String(form.assistant_phone)} onChange={(e) => setForm((p) => ({ ...p, assistant_phone: e.target.value }))} className="rounded-md border border-border bg-card px-2 py-2 text-sm" />
        <input placeholder="Fuel Level" value={String(form.fuel_level)} onChange={(e) => setForm((p) => ({ ...p, fuel_level: e.target.value }))} className="rounded-md border border-border bg-card px-2 py-2 text-sm" />
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Core Checklist</p>
          <button
            type="button"
            onClick={() => {
              const next: Record<string, ChecklistValue> = {};
              CORE_CHECKLIST_ITEMS.forEach((item) => {
                next[item.code] = { status: "pass", note: checklist[item.code]?.note ?? "" };
              });
              setChecklist(next);
              setForm((p) => ({
                ...p,
                brakes: true,
                tyres: true,
                lights: true,
                mirrors: true,
                horn: true,
                fuel_sufficient: true,
                load_area_ready: true,
                load_secured: true,
                accepted: true,
              }));
            }}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Check All
          </button>
        </div>
        <div className="grid gap-2">
          {CORE_CHECKLIST_ITEMS.map((item) => (
            <div key={item.code} className="rounded-md border border-border bg-card p-2">
              <div className="grid gap-2 md:grid-cols-[1fr_120px_1fr]">
                <div>
                  <p className="text-sm text-foreground">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground">{item.code} · {item.severity}</p>
                </div>
                <select
                  value={checklist[item.code]?.status ?? ""}
                  onChange={(e) =>
                    setChecklist((p) => ({
                      ...p,
                      [item.code]: {
                        status: e.target.value as ChecklistStatusOption,
                        note: p[item.code]?.note ?? "",
                      },
                    }))
                  }
                  className="rounded-md border border-border bg-card px-2 py-2 text-xs"
                >
                  <option value="">Select</option>
                  <option value="pass">pass</option>
                  <option value="fail">fail</option>
                  <option value="na">na</option>
                </select>
                <input
                  value={checklist[item.code]?.note ?? ""}
                  onChange={(e) =>
                    setChecklist((p) => ({
                      ...p,
                      [item.code]: {
                        status: p[item.code]?.status ?? "",
                        note: e.target.value,
                      },
                    }))
                  }
                  placeholder="Note (optional)"
                  className="rounded-md border border-border bg-card px-2 py-2 text-xs"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {uploadFields.map(({ key, label, url }) => (
          <label key={key} className="rounded-md border border-border bg-card p-2 text-xs text-muted-foreground">
            {label}
            <input type="file" className="mt-1 block w-full" onChange={(e) => setFiles((p) => ({ ...p, [key]: e.target.files?.[0] ?? null }))} />
            {typeof url === "string" && url ? (
              <a href={url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-primary hover:underline">
                View current
              </a>
            ) : null}
          </label>
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-300 disabled:opacity-50">
          {saveMutation.isPending ? "Saving..." : preTrip?.id ? "Update Pre-Trip" : "Create Pre-Trip"}
        </button>
        <button type="button" onClick={() => verifyMutation.mutate()} disabled={verifyMutation.isPending} className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-300 disabled:opacity-50">
          {verifyMutation.isPending ? "Verifying..." : "Verify"}
        </button>
        <button
          type="button"
          onClick={() => confirmMutation.mutate()}
          disabled={confirmMutation.isPending || !requiredChecksPassed || hasBlockingChecklistFailure}
          className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 disabled:opacity-50"
        >
          {confirmMutation.isPending ? "Confirming..." : "Confirm"}
        </button>
      </div>
      {hasBlockingChecklistFailure ? (
        <p className="mt-2 text-xs text-amber-300">Confirm disabled: all blocker checklist items must be marked pass.</p>
      ) : null}

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <label className="block text-xs text-muted-foreground">
          Verification status
          <select value={verifyStatus} onChange={(e) => setVerifyStatus(e.target.value as "approved" | "rejected")} className="mt-1 w-full rounded-md border border-border bg-card px-2 py-2 text-sm">
            <option value="approved">Approve</option>
            <option value="rejected">Reject</option>
          </select>
        </label>
        <label className="block text-xs text-muted-foreground">
          Verification note
          <textarea value={verifyNote} onChange={(e) => setVerifyNote(e.target.value)} rows={2} className="mt-1 w-full rounded-md border border-border bg-card px-2 py-2 text-sm" />
        </label>
      </div>

      {message ? (
        <p className={cn("mt-3 text-sm", message.tone === "success" ? "text-emerald-300" : "text-rose-300")}>
          {message.text}
        </p>
      ) : null}
    </Section>
  );
}

export default function TripDetailPage() {
  const params = useParams();
  const tripId = String(params?.id ?? "");
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<TabKey>("overview");
  const [fuelDraft, setFuelDraft] = useState({
    fuel_allocated_litres: "",
    fuel_allocation_station: "",
    fuel_allocation_payment_mode: "cash",
    fuel_allocation_reference: "",
    fuel_allocation_note: "",
  });
  const [roadDraft, setRoadDraft] = useState({
    road_expense_disbursed: "",
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

  const { data: omcBalancesData } = useQuery({
    queryKey: ["fuel", "omc_balances", "trip-detail"],
    queryFn: fetchOmcBalances,
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
    mutationFn: () => {
      const disbursed = String(roadDraft.road_expense_disbursed || trip?.road_expense_disbursed || "").replace(/,/g, "").trim();
      const payload: Record<string, unknown> = {
        road_expense_disbursed: disbursed || null,
        road_expense_reference: roadDraft.road_expense_reference || trip?.road_expense_reference || null,
        road_expense_payment_status: disbursed
          ? "paid"
          : roadDraft.road_expense_payment_status || trip?.road_expense_payment_status || "pending",
        road_expense_payment_method:
          roadDraft.road_expense_payment_method || trip?.road_expense_payment_method || "cash",
        road_expense_payment_reference:
          roadDraft.road_expense_payment_reference || trip?.road_expense_payment_reference || null,
        road_expense_note: roadDraft.road_expense_note || trip?.road_expense_note || null,
      };
      return updateRoadExpense(Number(tripId), payload as Partial<Trip>);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      await queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
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

  const fuelStationOptions = useMemo(() => {
    const rows = omcBalancesData?.items ?? [];
    const values = rows
      .map((row) => String(row.omc_name ?? "").trim())
      .filter((v) => v.length > 0);
    const set = new Set(values);
    if (trip?.fuel_allocation_station) set.add(String(trip.fuel_allocation_station));
    return Array.from(set);
  }, [omcBalancesData?.items, trip?.fuel_allocation_station]);

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

        <div className="mt-4">
          <TripWorkflowSteps status={trip.status} compact />
        </div>
      </header>

      <div className="flex gap-2 border-b border-border pb-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
              tab === t.key ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-card"
            )}
          >
            {t.label}
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
                  <GoogleMap lat={trip.latest_location.lat} lng={trip.latest_location.lng} />
                </Section>
              ) : null}
            </>
          ) : null}

          {tab === "dispatch" ? (
            <PreTripCard
              tripId={Number(tripId)}
              trip={trip}
              preTrip={preTrip ?? null}
              onRefresh={async () => {
                await queryClient.invalidateQueries({ queryKey: ["trip", tripId, "pre_trip"] });
                await queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
              }}
            />
          ) : null}

          {tab === "documents" ? (
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

          {tab === "money" ? (
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

          {tab === "activity" ? (
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
          <Section title="Inspection Status" subtitle="Current pre-trip workflow state">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Verification: {preTrip?.inspection_verification_status ?? "pending"}</p>
              <p>Confirmed: {preTrip?.inspection_confirmed ? "yes" : "no"}</p>
              <p>Verified At: {preTrip?.inspection_verified_at ? formatDate(preTrip.inspection_verified_at) : "-"}</p>
              <p>Confirmed At: {preTrip?.inspection_confirmed_at ? formatDate(preTrip.inspection_confirmed_at) : "-"}</p>
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
              <select
                value={fuelDraft.fuel_allocation_station}
                onChange={(e) => setFuelDraft((p) => ({ ...p, fuel_allocation_station: e.target.value }))}
                className="w-full rounded-md border border-border bg-card px-2 py-2 text-sm"
              >
                <option value="">{trip.fuel_allocation_station ?? "Select Fuel Station / OMC"}</option>
                {fuelStationOptions.map((station) => (
                  <option key={station} value={station}>
                    {station}
                  </option>
                ))}
              </select>
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
              <label className="block text-xs text-muted-foreground">
                Disbursement Method
                <select
                  value={roadDraft.road_expense_payment_method}
                  onChange={(e) =>
                    setRoadDraft((p) => ({
                      ...p,
                      road_expense_payment_method: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-border bg-card px-2 py-2 text-sm"
                >
                  <option value="cash">Cash</option>
                  <option value="momo">Mobile Money</option>
                </select>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Amount disbursed"
                value={roadDraft.road_expense_disbursed}
                onChange={(e) => setRoadDraft((p) => ({ ...p, road_expense_disbursed: e.target.value }))}
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
