"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  fetchClientShipmentDetail,
  fetchClientShipmentEvents,
  fetchClientShipmentPod,
  fetchClientShipmentTrack,
  submitClientShipmentFeedback,
} from "@/lib/api/client-portal";

type TabKey = "overview" | "track" | "events" | "pod" | "feedback";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "track", label: "Live Tracking" },
  { key: "events", label: "Events Timeline" },
  { key: "pod", label: "POD" },
  { key: "feedback", label: "Feedback" },
];

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asList(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
  const payload = asRecord(value);
  const keys = ["data", "items", "events"];
  for (const key of keys) {
    const candidate = payload[key];
    if (Array.isArray(candidate)) return candidate as Array<Record<string, unknown>>;
  }
  return [];
}

export default function ClientShipmentDetailPage() {
  const params = useParams();
  const trackingNumber = String(params?.tracking_number ?? "");
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");

  const detailQuery = useQuery({
    queryKey: ["client", "shipment", trackingNumber],
    queryFn: () => fetchClientShipmentDetail(trackingNumber),
    enabled: Boolean(trackingNumber),
  });
  const trackQuery = useQuery({
    queryKey: ["client", "shipment-track", trackingNumber],
    queryFn: () => fetchClientShipmentTrack(trackingNumber),
    enabled: Boolean(trackingNumber) && activeTab === "track",
  });
  const eventsQuery = useQuery({
    queryKey: ["client", "shipment-events", trackingNumber],
    queryFn: () => fetchClientShipmentEvents(trackingNumber),
    enabled: Boolean(trackingNumber) && activeTab === "events",
  });
  const podQuery = useQuery({
    queryKey: ["client", "shipment-pod", trackingNumber],
    queryFn: () => fetchClientShipmentPod(trackingNumber),
    enabled: Boolean(trackingNumber) && activeTab === "pod",
  });

  const feedbackMutation = useMutation({
    mutationFn: () =>
      submitClientShipmentFeedback(trackingNumber, {
        rating: Number(rating),
        comment,
      }),
  });

  const detail = useMemo(() => asRecord(detailQuery.data), [detailQuery.data]);
  const events = useMemo(() => eventsQuery.data?.items ?? [], [eventsQuery.data?.items]);
  const pod = useMemo(() => asRecord(podQuery.data), [podQuery.data]);
  const track = useMemo(() => asRecord(trackQuery.data), [trackQuery.data]);

  return (
    <div className="space-y-4">
      <section className="ops-card p-4">
        <p className="ops-section-title">Shipment</p>
        <h2 className="mt-1 text-xl font-semibold text-foreground">{trackingNumber}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {String(detail.origin ?? "-")} → {String(detail.destination ?? "-")} · {String(detail.status ?? "-")}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={[
                "rounded-lg border px-3 py-2 text-sm",
                activeTab === tab.key ? "border-primary/40 bg-primary/15 text-foreground" : "border-border text-muted-foreground",
              ].join(" ")}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {detailQuery.isLoading ? <div className="ops-card p-6 text-sm text-muted-foreground">Loading shipment...</div> : null}
      {detailQuery.isError ? <div className="ops-card p-6 text-sm text-rose-300">Unable to load shipment detail.</div> : null}

      {activeTab === "overview" ? (
        <section className="ops-card p-4 text-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <p>Customer Reference: <span className="text-muted-foreground">{String(detail.customer_reference ?? "-")}</span></p>
            <p>Shipment Date: <span className="text-muted-foreground">{String(detail.shipment_date ?? detail.created_at ?? "-")}</span></p>
            <p>ETA: <span className="text-muted-foreground">{String(detail.eta ?? detail.expected_delivery ?? "-")}</span></p>
            <p>Receiver: <span className="text-muted-foreground">{String(detail.receiver ?? detail.consignee ?? "-")}</span></p>
          </div>
        </section>
      ) : null}

      {activeTab === "track" ? (
        <section className="ops-card p-4 text-sm">
          {trackQuery.isLoading ? <p className="text-muted-foreground">Loading live tracking...</p> : null}
          {trackQuery.isError ? <p className="text-rose-300">Unable to load tracking data.</p> : null}
          {!trackQuery.isLoading && !trackQuery.isError ? (
            <div className="space-y-2">
              <p>Current Status: <span className="text-muted-foreground">{String(track.status ?? detail.status ?? "-")}</span></p>
              <p>Latitude: <span className="text-muted-foreground">{String(track.lat ?? track.latitude ?? "-")}</span></p>
              <p>Longitude: <span className="text-muted-foreground">{String(track.lng ?? track.longitude ?? "-")}</span></p>
              <p>Last Updated: <span className="text-muted-foreground">{String(track.updated_at ?? "-")}</span></p>
            </div>
          ) : null}
        </section>
      ) : null}

      {activeTab === "events" ? (
        <section className="ops-card p-4 text-sm">
          {eventsQuery.isLoading ? <p className="text-muted-foreground">Loading events...</p> : null}
          {eventsQuery.isError ? <p className="text-rose-300">Unable to load events.</p> : null}
          {!eventsQuery.isLoading && !eventsQuery.isError && events.length === 0 ? (
            <p className="text-muted-foreground">No timeline events.</p>
          ) : null}
          <div className="space-y-2">
            {events.map((event, index) => (
              <article key={index} className="rounded-lg border border-border p-3">
                <p className="font-semibold text-foreground">{String(event.title ?? event.status ?? "Event")}</p>
                <p className="text-xs text-muted-foreground">{String(event.description ?? event.message ?? "-")}</p>
                <p className="text-xs text-muted-foreground">{String(event.created_at ?? event.timestamp ?? "-")}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "pod" ? (
        <section className="ops-card p-4 text-sm">
          {podQuery.isLoading ? <p className="text-muted-foreground">Loading POD...</p> : null}
          {podQuery.isError ? <p className="text-rose-300">Unable to load POD.</p> : null}
          {!podQuery.isLoading && !podQuery.isError ? (
            <div className="space-y-2">
              <p>POD Status: <span className="text-muted-foreground">{String(pod.status ?? "-")}</span></p>
              <p>Delivered At: <span className="text-muted-foreground">{String(pod.delivered_at ?? "-")}</span></p>
              {pod.file_url ? (
                <a href={String(pod.file_url)} target="_blank" rel="noreferrer" className="inline-block rounded-lg border border-border px-3 py-2 text-xs text-primary">
                  Open POD file
                </a>
              ) : (
                <p className="text-muted-foreground">No POD file attached.</p>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      {activeTab === "feedback" ? (
        <section className="ops-card p-4 text-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Rating
              <select
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm normal-case tracking-normal"
              >
                <option value="5">5 - Excellent</option>
                <option value="4">4 - Good</option>
                <option value="3">3 - Fair</option>
                <option value="2">2 - Poor</option>
                <option value="1">1 - Very Poor</option>
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Comment
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="mt-2 h-24 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm normal-case tracking-normal"
                placeholder="Share your delivery experience"
              />
            </label>
          </div>
          <button
            type="button"
            className="mt-3 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            onClick={() => feedbackMutation.mutate()}
            disabled={feedbackMutation.isPending}
          >
            {feedbackMutation.isPending ? "Submitting..." : "Submit Feedback"}
          </button>
          {feedbackMutation.isSuccess ? <p className="mt-2 text-xs text-emerald-300">Feedback submitted.</p> : null}
          {feedbackMutation.isError ? <p className="mt-2 text-xs text-rose-300">Failed to submit feedback.</p> : null}
        </section>
      ) : null}
    </div>
  );
}
