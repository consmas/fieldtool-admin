"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, CheckCircle2, CircleDollarSign, Plus, RefreshCcw, XCircle } from "lucide-react";
import { fetchTrips } from "@/lib/api/trips";
import { fetchUsers } from "@/lib/api/users";
import { fetchVehicles } from "@/lib/api/vehicles";
import {
  approveExpense,
  bulkApproveExpenses,
  bulkMarkPaidExpenses,
  bulkRejectExpenses,
  createExpense,
  deleteExpense,
  fetchExpenses,
  fetchExpenseSummary,
  markExpensePaid,
  recalculateFuelExpenses,
  rejectExpense,
  submitExpense,
  syncRoadFeeAutomation,
  type ExpenseCategory,
  type ExpenseEntry,
  type ExpenseStatus,
} from "@/lib/api/expenses";
import { formatDate } from "@/lib/utils/format";

const CATEGORIES: ExpenseCategory[] = [
  "fuel",
  "road_fee",
  "salary",
  "purchase",
  "tires",
  "maintenance",
  "repair",
  "emergency",
  "other",
];

const STATUSES: Array<ExpenseStatus | "all"> = ["all", "draft", "pending", "approved", "rejected", "paid"];

function asNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function formatCurrency(amount: number, currency = "GHS") {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

function statusClasses(status?: string | null) {
  const s = (status ?? "draft").toLowerCase();
  if (s === "approved") return "border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
  if (s === "paid") return "border-sky-500/30 bg-sky-500/15 text-sky-300";
  if (s === "rejected") return "border-rose-500/30 bg-rose-500/15 text-rose-300";
  if (s === "pending") return "border-amber-500/30 bg-amber-500/15 text-amber-300";
  return "border-slate-500/30 bg-slate-500/15 text-slate-300";
}

export default function ExpensisPage() {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [form, setForm] = useState({
    category: "other" as ExpenseCategory,
    amount: "",
    description: "",
    trip_id: "",
    vehicle_id: "",
    driver_id: "",
    expense_date: "",
  });

  const { data: trips = [] } = useQuery({
    queryKey: ["trips", "expense-form-lookup"],
    queryFn: fetchTrips,
  });
  const { data: users = [] } = useQuery({
    queryKey: ["users", "expense-form-lookup"],
    queryFn: fetchUsers,
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles", "expense-form-lookup"],
    queryFn: fetchVehicles,
  });

  const { data: expensesResult, isLoading, isError } = useQuery({
    queryKey: ["expenses", { category, status, search }],
    queryFn: () =>
      fetchExpenses({
        category: category !== "all" ? category : undefined,
        status: status !== "all" ? status : undefined,
        q: search || undefined,
      }),
    refetchInterval: 20_000,
  });

  const expenses = useMemo(() => expensesResult?.items ?? [], [expensesResult?.items]);

  const { data: summary = {} } = useQuery({
    queryKey: ["expenses", "summary", { category, status, search }],
    queryFn: () =>
      fetchExpenseSummary({
        category: category !== "all" ? category : undefined,
        status: status !== "all" ? status : undefined,
        q: search || undefined,
      }),
    refetchInterval: 20_000,
  });

  const refreshExpenses = async () => {
    await queryClient.invalidateQueries({ queryKey: ["expenses"] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: Partial<ExpenseEntry>) => createExpense(payload),
    onSuccess: async () => {
      setForm({
        category: "other",
        amount: "",
        description: "",
        trip_id: "",
        vehicle_id: "",
        driver_id: "",
        expense_date: "",
      });
      await refreshExpenses();
    },
  });

  const submitMutation = useMutation({
    mutationFn: (id: number) => submitExpense(id),
    onSuccess: refreshExpenses,
  });
  const approveMutation = useMutation({
    mutationFn: (id: number) => approveExpense(id),
    onSuccess: refreshExpenses,
  });
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => rejectExpense(id, reason),
    onSuccess: refreshExpenses,
  });
  const markPaidMutation = useMutation({
    mutationFn: (id: number) => markExpensePaid(id),
    onSuccess: refreshExpenses,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteExpense(id),
    onSuccess: refreshExpenses,
  });

  const bulkApproveMutation = useMutation({
    mutationFn: (ids: number[]) => bulkApproveExpenses(ids),
    onSuccess: async () => {
      setSelected(new Set());
      await refreshExpenses();
    },
  });
  const bulkRejectMutation = useMutation({
    mutationFn: ({ ids, reason }: { ids: number[]; reason: string }) => bulkRejectExpenses(ids, reason),
    onSuccess: async () => {
      setSelected(new Set());
      await refreshExpenses();
    },
  });
  const bulkPaidMutation = useMutation({
    mutationFn: (ids: number[]) => bulkMarkPaidExpenses(ids),
    onSuccess: async () => {
      setSelected(new Set());
      await refreshExpenses();
    },
  });

  const roadFeeSyncMutation = useMutation({
    mutationFn: () => syncRoadFeeAutomation(),
    onSuccess: refreshExpenses,
  });

  const fuelRecalcMutation = useMutation({
    mutationFn: () => recalculateFuelExpenses(),
    onSuccess: refreshExpenses,
  });

  const selectedIds = Array.from(selected);
  const totalExpense = useMemo(() => {
    const direct = asNumber((summary.total_expense as number | string | undefined) ?? summary.total);
    if (direct > 0) return direct;
    return expenses.reduce((sum, row) => sum + asNumber(row.amount), 0);
  }, [expenses, summary.total, summary.total_expense]);

  const totalPending = useMemo(() => {
    const direct = asNumber(summary.pending_total as number | string | undefined);
    if (direct > 0) return direct;
    return expenses
      .filter((row) => (row.status ?? "").toLowerCase() === "pending")
      .reduce((sum, row) => sum + asNumber(row.amount), 0);
  }, [expenses, summary.pending_total]);

  const totalPaid = useMemo(() => {
    const direct = asNumber(summary.paid_total as number | string | undefined);
    if (direct > 0) return direct;
    return expenses
      .filter((row) => (row.status ?? "").toLowerCase() === "paid")
      .reduce((sum, row) => sum + asNumber(row.amount), 0);
  }, [expenses, summary.paid_total]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="ops-section-title">Finance</p>
          <h2 className="text-xl font-semibold">Expensis</h2>
          <p className="text-sm text-muted-foreground">
            Fleet expenses, approvals, automation, and fuel recalculation.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => roadFeeSyncMutation.mutate()}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
            disabled={roadFeeSyncMutation.isPending}
          >
            <Bot className="h-3.5 w-3.5" />
            {roadFeeSyncMutation.isPending ? "Syncing..." : "Sync Road Fee"}
          </button>
          <button
            type="button"
            onClick={() => fuelRecalcMutation.mutate()}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
            disabled={fuelRecalcMutation.isPending}
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            {fuelRecalcMutation.isPending ? "Recalculating..." : "Recalculate Fuel"}
          </button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="ops-card border-l-2 border-l-indigo-400 p-4">
          <p className="ops-section-title">Total Expense</p>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(totalExpense)}</p>
        </article>
        <article className="ops-card border-l-2 border-l-amber-400 p-4">
          <p className="ops-section-title">Pending</p>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(totalPending)}</p>
        </article>
        <article className="ops-card border-l-2 border-l-sky-400 p-4">
          <p className="ops-section-title">Paid</p>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(totalPaid)}</p>
        </article>
        <article className="ops-card border-l-2 border-l-emerald-400 p-4">
          <p className="ops-section-title">Records</p>
          <p className="mt-2 text-2xl font-bold">{expenses.length}</p>
        </article>
      </section>

      <section className="ops-card p-4">
        <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description, trip, vendor, reference..."
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All Statuses" : s}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="ops-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Create Expense</h3>
        </div>
        <form
          className="grid gap-3 md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate({
              category: form.category,
              amount: Number(form.amount),
              description: form.description || undefined,
              trip_id: form.trip_id ? Number(form.trip_id) : undefined,
              vehicle_id: form.vehicle_id ? Number(form.vehicle_id) : undefined,
              driver_id: form.driver_id ? Number(form.driver_id) : undefined,
              expense_date: form.expense_date || undefined,
            });
          }}
        >
          <select
            value={form.category}
            onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as ExpenseCategory }))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            placeholder="Amount"
            value={form.amount}
            onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary"
          />
          <input
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary"
          />
          <select
            value={form.trip_id}
            onChange={(e) => {
              const tripId = e.target.value;
              setForm((p) => {
                const next = { ...p, trip_id: tripId };
                if (!tripId) return next;
                const trip = trips.find((t) => t.id === Number(tripId));
                if (!trip) return next;
                if (!p.driver_id && trip.driver_id) next.driver_id = String(trip.driver_id);
                const vehicleId = trip.vehicle_id ?? trip.truck_id ?? null;
                if (!p.vehicle_id && vehicleId) next.vehicle_id = String(vehicleId);
                return next;
              });
            }}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary"
          >
            <option value="">Trip (optional)</option>
            {trips.map((trip) => (
              <option key={trip.id} value={trip.id}>
                {(trip.waybill_number ?? trip.reference_code ?? `Trip ${trip.id}`)} ({trip.id})
              </option>
            ))}
          </select>
          <select
            value={form.vehicle_id}
            onChange={(e) => setForm((p) => ({ ...p, vehicle_id: e.target.value }))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary"
          >
            <option value="">Vehicle (optional)</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.name} ({vehicle.id})
              </option>
            ))}
          </select>
          <select
            value={form.driver_id}
            onChange={(e) => setForm((p) => ({ ...p, driver_id: e.target.value }))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary"
          >
            <option value="">Driver (optional)</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {(user.name ?? user.email)} ({user.id})
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={form.expense_date}
            onChange={(e) => setForm((p) => ({ ...p, expense_date: e.target.value }))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary md:col-span-2"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Create"}
          </button>
        </form>
      </section>

      {selected.size > 0 ? (
        <section className="rounded-lg border border-primary/30 bg-primary/10 p-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-primary">{selected.size} selected</span>
            <button
              type="button"
              onClick={() => bulkApproveMutation.mutate(selectedIds)}
              className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300"
            >
              <CheckCircle2 className="h-3 w-3" />
              Approve
            </button>
            <button
              type="button"
              onClick={() => {
                const reason = window.prompt("Reject reason");
                if (!reason) return;
                bulkRejectMutation.mutate({ ids: selectedIds, reason });
              }}
              className="inline-flex items-center gap-1 rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-300"
            >
              <XCircle className="h-3 w-3" />
              Reject
            </button>
            <button
              type="button"
              onClick={() => bulkPaidMutation.mutate(selectedIds)}
              className="inline-flex items-center gap-1 rounded border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-xs text-sky-300"
            >
              <CircleDollarSign className="h-3 w-3" />
              Mark Paid
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="ml-auto rounded border border-border px-2 py-1 text-xs text-muted-foreground"
            >
              Clear
            </button>
          </div>
        </section>
      ) : null}

      {isLoading ? (
        <div className="ops-card p-6 text-sm text-muted-foreground">Loading expenses...</div>
      ) : isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">
          Unable to load expenses.
        </div>
      ) : (
        <section className="ops-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full text-sm">
              <thead className="bg-muted/60 text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={expenses.length > 0 && expenses.every((e) => selected.has(e.id))}
                      onChange={(e) => {
                        if (e.target.checked) setSelected(new Set(expenses.map((row) => row.id)));
                        else setSelected(new Set());
                      }}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                  </th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Trip/Vehicle/Driver</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No expenses found.
                    </td>
                  </tr>
                ) : (
                  expenses.map((row) => (
                    <tr key={row.id} className="border-t border-border/80 hover:bg-accent/30">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(row.id)}
                          onChange={() =>
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (next.has(row.id)) next.delete(row.id);
                              else next.add(row.id);
                              return next;
                            })
                          }
                          className="h-3.5 w-3.5 accent-primary"
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">{row.category}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <p>{row.description ?? "-"}</p>
                        {row.is_auto_generated ? (
                          <span className="mt-1 inline-flex rounded border border-indigo-500/30 bg-indigo-500/15 px-1.5 py-0.5 text-[10px] text-indigo-300">
                            auto
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {formatCurrency(asNumber(row.amount), row.currency ?? "GHS")}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <p>Trip: {row.trip_id ?? "-"}</p>
                        <p>Vehicle: {row.vehicle_id ?? "-"}</p>
                        <p>Driver: {row.driver_id ?? "-"}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(row.expense_date ?? row.created_at ?? undefined)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusClasses(row.status)}`}>
                          {row.status ?? "draft"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => submitMutation.mutate(row.id)}
                            className="rounded border border-border bg-card px-2 py-1 text-xs text-muted-foreground"
                          >
                            Submit
                          </button>
                          <button
                            type="button"
                            onClick={() => approveMutation.mutate(row.id)}
                            className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const reason = window.prompt("Reject reason");
                              if (!reason) return;
                              rejectMutation.mutate({ id: row.id, reason });
                            }}
                            className="rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-300"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => markPaidMutation.mutate(row.id)}
                            className="rounded border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-xs text-sky-300"
                          >
                            Paid
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm("Delete this expense?")) deleteMutation.mutate(row.id);
                            }}
                            className="rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-300"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="ops-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Summary by Category</h3>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {Object.entries(
            (summary.by_category as Record<string, number>) ??
              (summary.categories as Record<string, number>) ??
              {}
          ).map(([key, value]) => (
            <article key={key} className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{key}</p>
              <p className="mt-1 font-semibold text-foreground">{formatCurrency(asNumber(value))}</p>
            </article>
          ))}
        </div>
        {Object.keys(
          (summary.by_category as Record<string, number>) ??
            (summary.categories as Record<string, number>) ??
            {}
        ).length === 0 ? (
          <p className="text-sm text-muted-foreground">No category summary returned yet.</p>
        ) : null}
      </section>

      <section className="ops-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Summary by Status</h3>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {Object.entries(
            (summary.by_status as Record<string, number>) ??
              (summary.statuses as Record<string, number>) ??
              {}
          ).map(([key, value]) => (
            <article key={key} className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{key}</p>
              <p className="mt-1 font-semibold text-foreground">{formatCurrency(asNumber(value))}</p>
            </article>
          ))}
        </div>
        {Object.keys(
          (summary.by_status as Record<string, number>) ??
            (summary.statuses as Record<string, number>) ??
            {}
        ).length === 0 ? (
          <p className="text-sm text-muted-foreground">No status summary returned yet.</p>
        ) : null}
      </section>
    </div>
  );
}
