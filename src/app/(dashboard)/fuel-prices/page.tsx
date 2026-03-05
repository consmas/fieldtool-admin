"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { fetchFuelPrices } from "@/lib/api/fuel_prices";
import { fetchVehicles } from "@/lib/api/vehicles";
import { fetchUsers } from "@/lib/api/users";
import { fetchTrips } from "@/lib/api/trips";
import {
  confirmFuelDeposit,
  createFuelDeposit,
  createTripFuelLogWithFunding,
  createVehicleFuelLogWithFunding,
  fetchFuelDeposits,
  fetchDriverFuelTrend,
  fetchFuelAnalysis,
  fetchFuelAnomalies,
  fetchFuelFleetReport,
  fetchFuelLogs,
  fetchOmcBalances,
  fetchOmcLedger,
  fetchVehicleFuelTrend,
  investigateFuelAnalysis,
  updateFuelDeposit,
  type FuelDeposit,
  type FuelDepositPaymentMethod,
  type FuelDepositStatus,
  type FuelFundingSource,
  type OmcName,
} from "@/lib/api/fuel_analytics";

type TabKey = "prices" | "transactions" | "deposits" | "wallet" | "ledger" | "anomalies" | "trends" | "history";

function asRecord(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  return v as Record<string, unknown>;
}
function toNumber(v: unknown) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 2 }).format(v || 0);
}
function formatDateTime(v: string | null | undefined) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString();
}
function toIsoDateBoundary(date: string, endOfDay = false) {
  if (!date) return undefined;
  return `${date}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`;
}
function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const responseData = error.response?.data as Record<string, unknown> | undefined;
    const message = responseData?.message;
    if (typeof message === "string" && message.trim()) return message;
    const errors = responseData?.errors;
    if (Array.isArray(errors) && errors.length > 0) return String(errors[0]);
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

const OMC_OPTIONS: Array<{ value: OmcName; label: string }> = [
  { value: "westport", label: "Westport" },
  { value: "top_oil", label: "Top Oil" },
  { value: "other", label: "Other" },
];
const DEPOSIT_STATUS_OPTIONS: Array<FuelDepositStatus> = ["draft", "confirmed", "cancelled"];
const PAYMENT_METHOD_OPTIONS: Array<FuelDepositPaymentMethod> = ["bank_transfer", "momo", "cash", "cheque"];

export default function FuelHubPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>("prices");
  const [period, setPeriod] = useState({ date_from: "", date_to: "" });
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [analysisId, setAnalysisId] = useState<string | number | null>(null);
  const [analysisNote, setAnalysisNote] = useState("");
  const [fuelLogError, setFuelLogError] = useState<string>("");
  const [logForm, setLogForm] = useState({
    scope: "vehicle",
    vehicle_id: "",
    trip_id: "",
    liters: "",
    total_cost: "",
    price_per_liter: "",
    transaction_date: "",
    funding_source: "cash" as FuelFundingSource,
    omc_name: "westport" as OmcName,
  });
  const [depositFilters, setDepositFilters] = useState({
    omc_name: "",
    status: "",
    date_from: "",
    date_to: "",
  });
  const [ledgerFilters, setLedgerFilters] = useState({
    omc_name: "",
    entry_type: "",
    date_from: "",
    date_to: "",
  });
  const [depositForm, setDepositForm] = useState({
    id: "",
    omc_name: "westport" as OmcName,
    amount: "",
    currency: "GHS",
    deposit_date: "",
    payment_method: "bank_transfer" as FuelDepositPaymentMethod,
    reference_no: "",
    status: "draft" as FuelDepositStatus,
    notes: "",
  });
  const [depositReceipt, setDepositReceipt] = useState<File | null>(null);
  const [depositMessage, setDepositMessage] = useState<string>("");

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "prices", label: "Fuel Prices" },
    { key: "transactions", label: "Transactions" },
    { key: "deposits", label: "Fuel Deposits" },
    { key: "wallet", label: "OMC Balances" },
    { key: "ledger", label: "OMC Ledger" },
    { key: "anomalies", label: "Anomalies" },
    { key: "trends", label: "Trends" },
    { key: "history", label: "History & Report" },
  ];

  const { data: prices = [], isLoading: pricesLoading, isError: pricesError } = useQuery({
    queryKey: ["fuel_prices"],
    queryFn: fetchFuelPrices,
  });
  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles", "fuel-hub"], queryFn: fetchVehicles });
  const { data: drivers = [] } = useQuery({ queryKey: ["users", "fuel-hub"], queryFn: fetchUsers });
  const { data: trips = [] } = useQuery({ queryKey: ["trips", "fuel-hub"], queryFn: fetchTrips });

  const logsQuery = useQuery({
    queryKey: ["fuel", "logs", vehicleId, period],
    queryFn: () =>
      fetchFuelLogs({
        vehicle_id: vehicleId ? Number(vehicleId) : undefined,
        date_from: period.date_from || undefined,
        date_to: period.date_to || undefined,
      }),
    enabled: tab !== "prices",
  });
  const analysisQuery = useQuery({ queryKey: ["fuel", "analysis"], queryFn: () => fetchFuelAnalysis(), enabled: tab === "anomalies" });
  const anomaliesQuery = useQuery({ queryKey: ["fuel", "anomalies"], queryFn: () => fetchFuelAnomalies(), enabled: tab === "anomalies" });
  const vehicleTrendQuery = useQuery({
    queryKey: ["fuel", "trend", "vehicle", vehicleId],
    queryFn: () => fetchVehicleFuelTrend(Number(vehicleId)),
    enabled: tab === "trends" && !!vehicleId,
  });
  const driverTrendQuery = useQuery({
    queryKey: ["fuel", "trend", "driver", driverId],
    queryFn: () => fetchDriverFuelTrend(Number(driverId)),
    enabled: tab === "trends" && !!driverId,
  });
  const reportQuery = useQuery({
    queryKey: ["fuel", "report", period],
    queryFn: () => fetchFuelFleetReport(period),
    enabled: tab === "history",
  });
  const depositsQuery = useQuery({
    queryKey: ["fuel", "deposits", depositFilters],
    queryFn: () =>
      fetchFuelDeposits({
        omc_name: depositFilters.omc_name || undefined,
        status: depositFilters.status || undefined,
        date_from: toIsoDateBoundary(depositFilters.date_from),
        date_to: toIsoDateBoundary(depositFilters.date_to, true),
      }),
    enabled: tab === "deposits",
  });
  const balancesQuery = useQuery({
    queryKey: ["fuel", "omc_balances"],
    queryFn: fetchOmcBalances,
    enabled: tab === "wallet" || tab === "deposits" || tab === "transactions" || tab === "ledger",
    refetchInterval: 30_000,
  });
  const ledgerQuery = useQuery({
    queryKey: ["fuel", "omc_ledger", ledgerFilters],
    queryFn: () =>
      fetchOmcLedger({
        omc_name: ledgerFilters.omc_name || undefined,
        entry_type: ledgerFilters.entry_type || undefined,
        date_from: toIsoDateBoundary(ledgerFilters.date_from),
        date_to: toIsoDateBoundary(ledgerFilters.date_to, true),
      }),
    enabled: tab === "ledger",
  });

  const createLogMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        liters: toNumber(logForm.liters),
        total_cost: toNumber(logForm.total_cost),
        price_per_liter: toNumber(logForm.price_per_liter),
        transaction_date: logForm.transaction_date || undefined,
        funding_source: logForm.funding_source,
        omc_name: logForm.funding_source === "omc_deposit" ? logForm.omc_name : undefined,
      };
      if (logForm.funding_source === "omc_deposit" && !logForm.omc_name) {
        throw new Error("Select OMC for OMC-funded fuel log.");
      }
      if (logForm.scope === "trip" && logForm.trip_id) return createTripFuelLogWithFunding(Number(logForm.trip_id), payload);
      if (logForm.vehicle_id) return createVehicleFuelLogWithFunding(Number(logForm.vehicle_id), payload);
      throw new Error("Pick vehicle or trip");
    },
    onSuccess: async () => {
      setFuelLogError("");
      await queryClient.invalidateQueries({ queryKey: ["fuel", "logs"] });
      await queryClient.invalidateQueries({ queryKey: ["fuel", "omc_balances"] });
      await queryClient.invalidateQueries({ queryKey: ["fuel", "omc_ledger"] });
      setLogForm({
        scope: "vehicle",
        vehicle_id: "",
        trip_id: "",
        liters: "",
        total_cost: "",
        price_per_liter: "",
        transaction_date: "",
        funding_source: "cash",
        omc_name: "westport",
      });
    },
    onError: (error) => {
      const message = getApiErrorMessage(error, "Unable to create fuel log.");
      if (message.toLowerCase().includes("insufficient") && logForm.funding_source === "omc_deposit") {
        setFuelLogError(`Insufficient OMC balance for ${logForm.omc_name}.`);
        return;
      }
      setFuelLogError(message);
    },
  });

  const saveDepositMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("fuel_deposit[omc_name]", depositForm.omc_name);
      formData.append("fuel_deposit[amount]", String(toNumber(depositForm.amount)));
      formData.append("fuel_deposit[currency]", depositForm.currency || "GHS");
      if (depositForm.deposit_date) formData.append("fuel_deposit[deposit_date]", depositForm.deposit_date);
      if (depositForm.payment_method) formData.append("fuel_deposit[payment_method]", depositForm.payment_method);
      if (depositForm.reference_no) formData.append("fuel_deposit[reference_no]", depositForm.reference_no);
      if (depositForm.status) formData.append("fuel_deposit[status]", depositForm.status);
      if (depositForm.notes) formData.append("fuel_deposit[notes]", depositForm.notes);
      if (depositReceipt) formData.append("fuel_deposit[receipt]", depositReceipt);
      if (depositForm.id) {
        return updateFuelDeposit(Number(depositForm.id), formData);
      }
      return createFuelDeposit(formData);
    },
    onSuccess: async () => {
      setDepositMessage("Deposit saved.");
      setDepositForm({
        id: "",
        omc_name: "westport",
        amount: "",
        currency: "GHS",
        deposit_date: "",
        payment_method: "bank_transfer",
        reference_no: "",
        status: "draft",
        notes: "",
      });
      setDepositReceipt(null);
      await queryClient.invalidateQueries({ queryKey: ["fuel", "deposits"] });
      await queryClient.invalidateQueries({ queryKey: ["fuel", "omc_balances"] });
      await queryClient.invalidateQueries({ queryKey: ["fuel", "omc_ledger"] });
    },
    onError: (error) => setDepositMessage(getApiErrorMessage(error, "Unable to save deposit.")),
  });

  const confirmDepositMutation = useMutation({
    mutationFn: (id: number | string) => confirmFuelDeposit(id),
    onSuccess: async () => {
      setDepositMessage("Deposit confirmed.");
      await queryClient.invalidateQueries({ queryKey: ["fuel", "deposits"] });
      await queryClient.invalidateQueries({ queryKey: ["fuel", "omc_balances"] });
      await queryClient.invalidateQueries({ queryKey: ["fuel", "omc_ledger"] });
    },
    onError: (error) => setDepositMessage(getApiErrorMessage(error, "Unable to confirm deposit.")),
  });

  const investigateMutation = useMutation({
    mutationFn: ({ id, note }: { id: string | number; note: string }) =>
      investigateFuelAnalysis(id, { status: "investigating", resolution_note: note || undefined }),
    onSuccess: async () => {
      setAnalysisId(null);
      setAnalysisNote("");
      await queryClient.invalidateQueries({ queryKey: ["fuel", "analysis"] });
      await queryClient.invalidateQueries({ queryKey: ["fuel", "anomalies"] });
    },
  });

  const logs = logsQuery.data?.items ?? [];
  const analysis = analysisQuery.data?.items ?? [];
  const anomalies = anomaliesQuery.data?.items ?? [];
  const deposits = depositsQuery.data?.items ?? [];
  const omcBalances = balancesQuery.data?.items ?? [];
  const ledger = ledgerQuery.data?.items ?? [];
  const unresolved = anomalies.filter((x) => !["resolved", "closed"].includes(String(x.status ?? "").toLowerCase()));
  const fuelReport = asRecord(reportQuery.data);
  const omcTotalBalance = omcBalances.reduce((sum, row) => sum + toNumber(row.balance), 0);

  const priceHistory = useMemo(() => {
    const from = period.date_from ? new Date(period.date_from).getTime() : null;
    const to = period.date_to ? new Date(period.date_to).getTime() : null;
    return [...prices].filter((p) => {
      const ts = new Date(p.effective_at).getTime();
      if (from && ts < from) return false;
      if (to && ts > to + 86400000) return false;
      return true;
    });
  }, [prices, period.date_from, period.date_to]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Fuel</p>
          <h2 className="text-lg font-semibold md:text-xl">Fuel Prices & Analytics Hub</h2>
          <p className="text-sm text-muted-foreground">Fuel prices, logs, anomalies, trends and period history in one place.</p>
        </div>
        <Link href="/fuel-prices/new" className="w-full rounded-xl bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground sm:w-auto">
          Add Fuel Price
        </Link>
      </div>

      <div className="ops-card p-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-lg border px-3 py-2 text-sm ${tab === t.key ? "border-primary/40 bg-primary/15 text-foreground" : "border-border text-muted-foreground"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "prices" ? (
        pricesLoading ? (
          <div className="ops-card p-6 text-sm text-muted-foreground">Loading...</div>
        ) : pricesError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">Unable to load fuel prices.</div>
        ) : (
          <div className="ops-card p-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <tr><th className="py-2">Price / Liter</th><th className="py-2">Effective At</th><th className="py-2">Actions</th></tr>
                </thead>
                <tbody>
                  {prices.map((price) => (
                    <tr key={price.id} className="border-t border-border">
                      <td className="py-3">{price.price_per_liter}</td>
                      <td className="py-3 text-muted-foreground">{price.effective_at}</td>
                      <td className="py-3"><Link href={`/fuel-prices/${price.id}/edit`} className="rounded-lg border border-border px-3 py-1 text-xs">Edit</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : null}

      {tab === "transactions" ? (
        <div className="space-y-4">
          <div className="ops-card p-4">
            <div className="grid gap-3 md:grid-cols-4">
              <select value={logForm.scope} onChange={(e) => setLogForm((p) => ({ ...p, scope: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <option value="vehicle">Vehicle log</option><option value="trip">Trip log</option>
              </select>
              {logForm.scope === "vehicle" ? (
                <select value={logForm.vehicle_id} onChange={(e) => setLogForm((p) => ({ ...p, vehicle_id: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                  <option value="">Select vehicle</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              ) : (
                <select value={logForm.trip_id} onChange={(e) => setLogForm((p) => ({ ...p, trip_id: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                  <option value="">Select trip</option>{trips.map((t) => <option key={t.id} value={t.id}>{`Trip #${t.id}`}</option>)}
                </select>
              )}
              <input value={logForm.liters} onChange={(e) => setLogForm((p) => ({ ...p, liters: e.target.value }))} placeholder="Liters" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
              <input value={logForm.total_cost} onChange={(e) => setLogForm((p) => ({ ...p, total_cost: e.target.value }))} placeholder="Total cost" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
              <input value={logForm.price_per_liter} onChange={(e) => setLogForm((p) => ({ ...p, price_per_liter: e.target.value }))} placeholder="Price/L" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
              <select
                value={logForm.funding_source}
                onChange={(e) =>
                  setLogForm((p) => ({ ...p, funding_source: e.target.value as FuelFundingSource, omc_name: p.omc_name || "westport" }))
                }
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                <option value="cash">Cash</option>
                <option value="fuel_card">Fuel Card</option>
                <option value="omc_deposit">OMC Deposit</option>
              </select>
              {logForm.funding_source === "omc_deposit" ? (
                <select
                  value={logForm.omc_name}
                  onChange={(e) => setLogForm((p) => ({ ...p, omc_name: e.target.value as OmcName }))}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
                >
                  {OMC_OPTIONS.map((omc) => (
                    <option key={omc.value} value={omc.value}>
                      {omc.label}
                    </option>
                  ))}
                </select>
              ) : null}
              <input type="datetime-local" value={logForm.transaction_date} onChange={(e) => setLogForm((p) => ({ ...p, transaction_date: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
            </div>
            <button type="button" onClick={() => createLogMutation.mutate()} disabled={createLogMutation.isPending} className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              {createLogMutation.isPending ? "Saving..." : "Create Fuel Log"}
            </button>
            {fuelLogError ? <p className="mt-2 text-sm text-rose-400">{fuelLogError}</p> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="ops-card p-4">
              <p className="ops-section-title">OMC Wallet Total</p>
              <p className="mt-2 text-2xl font-bold">{formatCurrency(omcTotalBalance)}</p>
            </article>
            {omcBalances.slice(0, 3).map((row, idx) => {
              const balance = toNumber(row.balance);
              const low = balance <= 0;
              return (
                <article key={`wallet-chip-${idx}`} className={`ops-card p-4 ${low ? "border-amber-400/40" : ""}`}>
                  <p className="ops-section-title">{String(row.omc_name ?? "OMC")}</p>
                  <p className={`mt-2 text-2xl font-bold ${low ? "text-amber-400" : ""}`}>{formatCurrency(balance)}</p>
                </article>
              );
            })}
          </div>
          <div className="ops-card p-4">
            {logsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading logs...</p> : null}
            {!logsQuery.isLoading && logs.length === 0 ? <p className="text-sm text-muted-foreground">No fuel logs.</p> : null}
            {logs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <tr><th className="py-2">Date</th><th className="py-2">Vehicle</th><th className="py-2">Trip</th><th className="py-2">Funding</th><th className="py-2">OMC</th><th className="py-2">Liters</th><th className="py-2">Price/L</th><th className="py-2">Cost</th></tr>
                  </thead>
                  <tbody>{logs.map((r, i) => (
                    <tr key={String(r.id ?? i)} className="border-t border-border">
                      <td className="py-2 text-muted-foreground">{formatDateTime(String(r.transaction_date ?? r.created_at ?? "-"))}</td>
                      <td className="py-2 text-muted-foreground">{String(r.vehicle_name ?? r.vehicle_id ?? "-")}</td>
                      <td className="py-2 text-muted-foreground">{String(r.trip_id ?? "-")}</td>
                      <td className="py-2 text-muted-foreground">{String(r.funding_source ?? "-")}</td>
                      <td className="py-2 text-muted-foreground">{String(r.omc_name ?? "-")}</td>
                      <td className="py-2 text-muted-foreground">{toNumber(r.liters).toFixed(2)}</td>
                      <td className="py-2 text-muted-foreground">{formatCurrency(toNumber(r.price_per_liter))}</td>
                      <td className="py-2 text-muted-foreground">{formatCurrency(toNumber(r.total_cost))}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "deposits" ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="ops-card p-4">
              <p className="ops-section-title">Total OMC Wallet</p>
              <p className="mt-2 text-2xl font-bold">{formatCurrency(omcTotalBalance)}</p>
            </article>
            <article className="ops-card p-4">
              <p className="ops-section-title">Deposits (Filtered)</p>
              <p className="mt-2 text-2xl font-bold">{deposits.length}</p>
            </article>
            <article className="ops-card p-4">
              <p className="ops-section-title">Draft</p>
              <p className="mt-2 text-2xl font-bold">{deposits.filter((d) => String(d.status ?? "").toLowerCase() === "draft").length}</p>
            </article>
            <article className="ops-card p-4">
              <p className="ops-section-title">Confirmed</p>
              <p className="mt-2 text-2xl font-bold">{deposits.filter((d) => String(d.status ?? "").toLowerCase() === "confirmed").length}</p>
            </article>
          </div>
          <div className="ops-card p-4">
            <div className="mb-3 grid gap-3 md:grid-cols-4">
              <select
                value={depositFilters.omc_name}
                onChange={(e) => setDepositFilters((p) => ({ ...p, omc_name: e.target.value }))}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                <option value="">All OMC</option>
                {OMC_OPTIONS.map((omc) => (
                  <option key={omc.value} value={omc.value}>
                    {omc.label}
                  </option>
                ))}
              </select>
              <select
                value={depositFilters.status}
                onChange={(e) => setDepositFilters((p) => ({ ...p, status: e.target.value }))}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                <option value="">All Status</option>
                {DEPOSIT_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input type="date" value={depositFilters.date_from} onChange={(e) => setDepositFilters((p) => ({ ...p, date_from: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
              <input type="date" value={depositFilters.date_to} onChange={(e) => setDepositFilters((p) => ({ ...p, date_to: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
            </div>
            <h3 className="mb-3 text-sm font-semibold">{depositForm.id ? "Edit Fuel Deposit" : "Create Fuel Deposit"}</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <select value={depositForm.omc_name} onChange={(e) => setDepositForm((p) => ({ ...p, omc_name: e.target.value as OmcName }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                {OMC_OPTIONS.map((omc) => (
                  <option key={omc.value} value={omc.value}>
                    {omc.label}
                  </option>
                ))}
              </select>
              <input value={depositForm.amount} onChange={(e) => setDepositForm((p) => ({ ...p, amount: e.target.value }))} placeholder="Amount" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
              <input value={depositForm.currency} onChange={(e) => setDepositForm((p) => ({ ...p, currency: e.target.value }))} placeholder="Currency" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
              <input type="date" value={depositForm.deposit_date} onChange={(e) => setDepositForm((p) => ({ ...p, deposit_date: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
              <select value={depositForm.payment_method} onChange={(e) => setDepositForm((p) => ({ ...p, payment_method: e.target.value as FuelDepositPaymentMethod }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                {PAYMENT_METHOD_OPTIONS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
              <select value={depositForm.status} onChange={(e) => setDepositForm((p) => ({ ...p, status: e.target.value as FuelDepositStatus }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                {DEPOSIT_STATUS_OPTIONS.map((depositStatus) => (
                  <option key={depositStatus} value={depositStatus}>
                    {depositStatus}
                  </option>
                ))}
              </select>
              <input value={depositForm.reference_no} onChange={(e) => setDepositForm((p) => ({ ...p, reference_no: e.target.value }))} placeholder="Reference no" className="rounded-lg border border-border bg-card px-3 py-2 text-sm md:col-span-2" />
              <input type="file" accept="image/*,.pdf" onChange={(e) => setDepositReceipt(e.target.files?.[0] ?? null)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
              <textarea value={depositForm.notes} onChange={(e) => setDepositForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes" className="h-20 rounded-lg border border-border bg-card px-3 py-2 text-sm md:col-span-3" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => saveDepositMutation.mutate()} disabled={saveDepositMutation.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                {saveDepositMutation.isPending ? "Saving..." : depositForm.id ? "Update Deposit" : "Create Deposit"}
              </button>
              {depositForm.id ? (
                <button
                  type="button"
                  onClick={() => {
                    setDepositForm({
                      id: "",
                      omc_name: "westport",
                      amount: "",
                      currency: "GHS",
                      deposit_date: "",
                      payment_method: "bank_transfer",
                      reference_no: "",
                      status: "draft",
                      notes: "",
                    });
                    setDepositReceipt(null);
                    setDepositMessage("");
                  }}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground"
                >
                  Cancel Edit
                </button>
              ) : null}
            </div>
            {depositReceipt ? <p className="mt-2 text-xs text-muted-foreground">Receipt selected: {depositReceipt.name}</p> : null}
            {depositMessage ? <p className="mt-2 text-sm text-muted-foreground">{depositMessage}</p> : null}
          </div>
          <div className="ops-card p-4">
            {depositsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading deposits...</p> : null}
            {!depositsQuery.isLoading && deposits.length === 0 ? <p className="text-sm text-muted-foreground">No deposits found.</p> : null}
            {deposits.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] text-sm">
                  <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="py-2">OMC</th>
                      <th className="py-2">Amount</th>
                      <th className="py-2">Currency</th>
                      <th className="py-2">Deposit Date</th>
                      <th className="py-2">Payment Method</th>
                      <th className="py-2">Reference No</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Created By</th>
                      <th className="py-2">Confirmed At</th>
                      <th className="py-2">Receipt</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deposits.map((row) => {
                      const status = String(row.status ?? "draft").toLowerCase();
                      const canConfirm = status === "draft";
                      const canEdit = status === "draft";
                      return (
                        <tr key={row.id} className="border-t border-border">
                          <td className="py-2 text-muted-foreground">{String(row.omc_name ?? "-")}</td>
                          <td className="py-2 text-muted-foreground">{formatCurrency(toNumber(row.amount))}</td>
                          <td className="py-2 text-muted-foreground">{String(row.currency ?? "GHS")}</td>
                          <td className="py-2 text-muted-foreground">{formatDateTime(row.deposit_date ?? null)}</td>
                          <td className="py-2 text-muted-foreground">{String(row.payment_method ?? "-")}</td>
                          <td className="py-2 text-muted-foreground">{String(row.reference_no ?? "-")}</td>
                          <td className="py-2 text-muted-foreground">{String(row.status ?? "-")}</td>
                          <td className="py-2 text-muted-foreground">{String(row.created_by_name ?? row.created_by_id ?? "-")}</td>
                          <td className="py-2 text-muted-foreground">{formatDateTime(row.confirmed_at ?? null)}</td>
                          <td className="py-2 text-muted-foreground">
                            {row.receipt_url ? (
                              <a href={row.receipt_url} target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">
                                View
                              </a>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="py-2">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                disabled={!canEdit}
                                onClick={() => {
                                  setDepositMessage("");
                                  setDepositReceipt(null);
                                  setDepositForm({
                                    id: String(row.id),
                                    omc_name: (String(row.omc_name || "westport") as OmcName),
                                    amount: String(toNumber(row.amount)),
                                    currency: String(row.currency ?? "GHS"),
                                    deposit_date: String(row.deposit_date ?? "").slice(0, 10),
                                    payment_method: (String(row.payment_method || "bank_transfer") as FuelDepositPaymentMethod),
                                    reference_no: String(row.reference_no ?? ""),
                                    status: (String(row.status || "draft") as FuelDepositStatus),
                                    notes: String(row.notes ?? ""),
                                  });
                                }}
                                className="rounded border border-border px-2 py-1 text-xs text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={!canConfirm || confirmDepositMutation.isPending || !row.id}
                                onClick={() => {
                                  if (!row.id) return;
                                  confirmDepositMutation.mutate(row.id);
                                }}
                                className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Confirm
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "wallet" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {omcBalances.map((row, idx) => {
              const balance = toNumber(row.balance);
              const low = balance <= 100;
              return (
                <article key={`omc-balance-${idx}`} className={`ops-card p-4 ${low ? "border-amber-500/30 bg-amber-500/5" : ""}`}>
                  <p className="ops-section-title">{String(row.omc_name ?? "OMC")}</p>
                  <p className={`mt-2 text-2xl font-bold ${low ? "text-amber-400" : ""}`}>{formatCurrency(balance)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Updated: {formatDateTime(row.updated_at ?? null)}</p>
                </article>
              );
            })}
          </div>
          {balancesQuery.isLoading ? <div className="ops-card p-4 text-sm text-muted-foreground">Loading balances...</div> : null}
          {!balancesQuery.isLoading && omcBalances.length === 0 ? <div className="ops-card p-4 text-sm text-muted-foreground">No OMC balance data.</div> : null}
        </div>
      ) : null}

      {tab === "ledger" ? (
        <div className="space-y-4">
          <div className="ops-card p-4">
            <div className="grid gap-3 md:grid-cols-4">
              <select value={ledgerFilters.omc_name} onChange={(e) => setLedgerFilters((p) => ({ ...p, omc_name: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <option value="">All OMC</option>
                {OMC_OPTIONS.map((omc) => (
                  <option key={omc.value} value={omc.value}>
                    {omc.label}
                  </option>
                ))}
              </select>
              <input value={ledgerFilters.entry_type} onChange={(e) => setLedgerFilters((p) => ({ ...p, entry_type: e.target.value }))} placeholder="Entry type" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
              <input type="date" value={ledgerFilters.date_from} onChange={(e) => setLedgerFilters((p) => ({ ...p, date_from: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
              <input type="date" value={ledgerFilters.date_to} onChange={(e) => setLedgerFilters((p) => ({ ...p, date_to: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="ops-card p-4">
            {ledgerQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading ledger...</p> : null}
            {!ledgerQuery.isLoading && ledger.length === 0 ? <p className="text-sm text-muted-foreground">No ledger entries found.</p> : null}
            {ledger.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] text-sm">
                  <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="py-2">Date</th>
                      <th className="py-2">OMC</th>
                      <th className="py-2">Entry Type</th>
                      <th className="py-2">Amount</th>
                      <th className="py-2">Balance Before</th>
                      <th className="py-2">Balance After</th>
                      <th className="py-2">Reference Type/ID</th>
                      <th className="py-2">Actor</th>
                      <th className="py-2">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((row, idx) => (
                      <tr key={String(row.id ?? idx)} className="border-t border-border">
                        <td className="py-2 text-muted-foreground">{formatDateTime((row.entry_date ?? row.created_at ?? null) as string | null)}</td>
                        <td className="py-2 text-muted-foreground">{String(row.omc_name ?? "-")}</td>
                        <td className="py-2 text-muted-foreground">{String(row.entry_type ?? "-")}</td>
                        <td className="py-2 text-muted-foreground">{formatCurrency(toNumber(row.amount))}</td>
                        <td className="py-2 text-muted-foreground">{formatCurrency(toNumber(row.balance_before))}</td>
                        <td className="py-2 text-muted-foreground">{formatCurrency(toNumber(row.balance_after))}</td>
                        <td className="py-2 text-muted-foreground">
                          {String(row.reference_type ?? "-")}
                          {row.reference_id ? ` / ${String(row.reference_id)}` : ""}
                        </td>
                        <td className="py-2 text-muted-foreground">{String(row.actor_name ?? "-")}</td>
                        <td className="py-2 text-muted-foreground">{String(row.note ?? "-")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "anomalies" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="ops-card p-4">
            <h3 className="mb-2 text-sm font-semibold">Analysis Records</h3>
            {analysisQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
            <div className="space-y-2">
              {analysis.map((r, i) => {
                const id = (r.id ?? i) as string | number;
                return (
                  <div key={String(id)} className="rounded border border-border p-3 text-sm">
                    <p className="font-semibold">{String(r.title ?? r.rule_name ?? `Analysis #${id}`)}</p>
                    <p className="text-xs text-muted-foreground">{String(r.summary ?? r.message ?? "-")}</p>
                    {analysisId === id ? (
                      <div className="mt-2 space-y-2">
                        <textarea value={analysisNote} onChange={(e) => setAnalysisNote(e.target.value)} className="h-16 w-full rounded border border-border bg-card px-2 py-1 text-xs" />
                        <button type="button" onClick={() => investigateMutation.mutate({ id, note: analysisNote })} className="rounded border border-primary/40 bg-primary/15 px-2 py-1 text-xs">
                          Investigate
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setAnalysisId(id)} className="mt-2 rounded border border-border px-2 py-1 text-xs">Open Investigation</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="ops-card p-4">
            <h3 className="mb-2 text-sm font-semibold">Unresolved Anomalies</h3>
            {anomaliesQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
            <div className="space-y-2">
              {unresolved.map((r, i) => (
                <div key={String(r.id ?? i)} className="rounded border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                  <p className="font-semibold">{String(r.title ?? r.anomaly_type ?? "Anomaly")}</p>
                  <p className="text-xs text-muted-foreground">{String(r.description ?? r.details ?? "-")}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {tab === "trends" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="ops-card p-4">
            <h3 className="mb-2 text-sm font-semibold">Vehicle Trend</h3>
            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="mb-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
              <option value="">Select vehicle</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            {vehicleTrendQuery.data ? <pre className="overflow-x-auto rounded border border-border bg-card p-3 text-xs text-muted-foreground">{JSON.stringify(vehicleTrendQuery.data, null, 2)}</pre> : <p className="text-sm text-muted-foreground">Select vehicle.</p>}
          </div>
          <div className="ops-card p-4">
            <h3 className="mb-2 text-sm font-semibold">Driver Trend</h3>
            <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className="mb-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
              <option value="">Select driver</option>{drivers.map((d) => <option key={d.id} value={d.id}>{d.name ?? d.email}</option>)}
            </select>
            {driverTrendQuery.data ? <pre className="overflow-x-auto rounded border border-border bg-card p-3 text-xs text-muted-foreground">{JSON.stringify(driverTrendQuery.data, null, 2)}</pre> : <p className="text-sm text-muted-foreground">Select driver.</p>}
          </div>
        </div>
      ) : null}

      {tab === "history" ? (
        <div className="space-y-4">
          <div className="ops-card p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <input type="date" value={period.date_from} onChange={(e) => setPeriod((p) => ({ ...p, date_from: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
              <input type="date" value={period.date_to} onChange={(e) => setPeriod((p) => ({ ...p, date_to: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="ops-card p-4"><p className="ops-section-title">Total Liters</p><p className="mt-2 text-2xl font-bold">{toNumber(fuelReport.total_liters ?? asRecord(fuelReport.totals).liters).toFixed(2)}</p></div>
            <div className="ops-card p-4"><p className="ops-section-title">Total Cost</p><p className="mt-2 text-2xl font-bold">{formatCurrency(toNumber(fuelReport.total_cost ?? asRecord(fuelReport.totals).cost))}</p></div>
            <div className="ops-card p-4"><p className="ops-section-title">Avg Cost/L</p><p className="mt-2 text-2xl font-bold">{formatCurrency(toNumber(fuelReport.avg_cost_per_liter ?? asRecord(fuelReport.totals).avg_cost_per_liter))}</p></div>
            <div className="ops-card p-4"><p className="ops-section-title">Anomaly Count</p><p className="mt-2 text-2xl font-bold">{String(toNumber(fuelReport.anomaly_count ?? asRecord(fuelReport.anomalies).count))}</p></div>
          </div>
          <div className="ops-card p-4">
            <h3 className="mb-2 text-sm font-semibold">Historical Fuel Logs (period)</h3>
            {logsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
            {!logsQuery.isLoading && logs.length === 0 ? <p className="text-sm text-muted-foreground">No logs in selected period.</p> : null}
            {logs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <tr><th className="py-2">Date</th><th className="py-2">Vehicle</th><th className="py-2">Liters</th><th className="py-2">Cost</th></tr>
                  </thead>
                  <tbody>{logs.map((r, i) => (
                    <tr key={String(r.id ?? i)} className="border-t border-border">
                      <td className="py-2 text-muted-foreground">{String(r.transaction_date ?? r.created_at ?? "-")}</td>
                      <td className="py-2 text-muted-foreground">{String(r.vehicle_name ?? r.vehicle_id ?? "-")}</td>
                      <td className="py-2 text-muted-foreground">{toNumber(r.liters).toFixed(2)}</td>
                      <td className="py-2 text-muted-foreground">{formatCurrency(toNumber(r.total_cost))}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : null}
          </div>
          <div className="ops-card p-4">
            <h3 className="mb-2 text-sm font-semibold">Historical Fuel Prices (period)</h3>
            {priceHistory.length === 0 ? <p className="text-sm text-muted-foreground">No fuel prices in selected period.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <tr><th className="py-2">Effective At</th><th className="py-2">Price/L</th></tr>
                  </thead>
                  <tbody>{priceHistory.map((p) => (
                    <tr key={p.id} className="border-t border-border"><td className="py-2 text-muted-foreground">{p.effective_at}</td><td className="py-2 text-muted-foreground">{p.price_per_liter}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
