"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchDriverCompliance, fetchVehicleCompliance, verifyTripCompliance } from "@/lib/api/compliance_incidents";
import { fetchDrivers } from "@/lib/api/driver_intelligence";
import { fetchVehicles } from "@/lib/api/vehicles";
import { fetchTrips } from "@/lib/api/trips";

export default function ComplianceDrilldownPage() {
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [tripId, setTripId] = useState("");

  const vehiclesQuery = useQuery({ queryKey: ["compliance", "vehicles"], queryFn: fetchVehicles });
  const driversQuery = useQuery({ queryKey: ["compliance", "drivers"], queryFn: fetchDrivers });
  const tripsQuery = useQuery({ queryKey: ["compliance", "trips"], queryFn: fetchTrips });

  const vehicleComplianceQuery = useQuery({
    queryKey: ["compliance", "vehicle", vehicleId],
    queryFn: () => fetchVehicleCompliance(vehicleId),
    enabled: Boolean(vehicleId),
  });

  const driverComplianceQuery = useQuery({
    queryKey: ["compliance", "driver", driverId],
    queryFn: () => fetchDriverCompliance(driverId),
    enabled: Boolean(driverId),
  });

  const verifyTripMutation = useMutation({
    mutationFn: () => verifyTripCompliance(tripId),
  });

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ops-section-title">Compliance</p>
          <h2 className="text-lg font-semibold md:text-xl">Vehicle / Driver Compliance Drilldown</h2>
        </div>
        <Link href="/compliance" className="rounded-lg border border-border px-3 py-2 text-sm">Back to Compliance</Link>
      </div>

      <section className="ops-card p-4">
        <h3 className="mb-2 text-sm font-semibold">Trip Compliance Gate</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <select value={tripId} onChange={(e) => setTripId(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option value="">Select trip</option>
            {(tripsQuery.data ?? []).map((trip) => (
              <option key={trip.id} value={trip.id}>
                {trip.waybill_number ?? trip.reference_code ?? `Trip ${trip.id}`}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => verifyTripMutation.mutate()} disabled={verifyTripMutation.isPending || !tripId} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {verifyTripMutation.isPending ? "Verifying..." : "Verify Trip Compliance"}
          </button>
        </div>
        {verifyTripMutation.data ? (
          <div className="mt-3 space-y-2">
            <p className="text-sm font-semibold">Verification Result</p>
            <pre className="overflow-x-auto rounded border border-border bg-card p-3 text-xs text-muted-foreground">
              {JSON.stringify(verifyTripMutation.data, null, 2)}
            </pre>
            <p className="text-xs text-muted-foreground">Blocking failures and warnings are shown in payload. Use this panel as “Why blocked?” remediation reference.</p>
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="ops-card p-4">
          <h3 className="mb-2 text-sm font-semibold">Vehicle Compliance</h3>
          <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="mb-3 rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option value="">Select vehicle</option>
            {(vehiclesQuery.data ?? []).map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.name}
              </option>
            ))}
          </select>
          {vehicleComplianceQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading vehicle compliance...</p> : null}
          {vehicleComplianceQuery.data ? (
            <pre className="overflow-x-auto rounded border border-border bg-card p-3 text-xs text-muted-foreground">
              {JSON.stringify(vehicleComplianceQuery.data, null, 2)}
            </pre>
          ) : null}
        </article>

        <article className="ops-card p-4">
          <h3 className="mb-2 text-sm font-semibold">Driver Compliance</h3>
          <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className="mb-3 rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option value="">Select driver</option>
            {(driversQuery.data ?? []).map((driver) => {
              const row = driver as Record<string, unknown>;
              return (
                <option key={String(row.id)} value={String(row.id)}>
                  {String(row.name ?? row.email ?? `Driver ${row.id}`)}
                </option>
              );
            })}
          </select>
          {driverComplianceQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading driver compliance...</p> : null}
          {driverComplianceQuery.data ? (
            <pre className="overflow-x-auto rounded border border-border bg-card p-3 text-xs text-muted-foreground">
              {JSON.stringify(driverComplianceQuery.data, null, 2)}
            </pre>
          ) : null}
        </article>
      </section>
    </div>
  );
}
