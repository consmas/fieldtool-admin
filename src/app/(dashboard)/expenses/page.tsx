"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, CheckCircle2, CircleDollarSign, Plus, RefreshCcw, XCircle } from "lucide-react";
import { fetchTrips } from "@/lib/api/trips";
import { fetchUsers } from "@/lib/api/users";
import { fetchVehicles } from "@/lib/api/vehicles";
import {
  approveExpense,
  bulkApproveExpenses,
  bulkDeleteExpenses,
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
  updateExpense,
  type ExpenseCategory,
  type ExpenseEntry,
  type ExpenseStatus,
} from "@/lib/api/expenses";
import {
  EXPENSE_CATEGORY_OPTIONS,
  getExpenseCategoryLabel,
} from "@/lib/constants/expenseCategories";
import { formatDate } from "@/lib/utils/format";

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

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"view" | "create">("view");
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [month, setMonth] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    category: "other_overheads" as ExpenseCategory,
    amount: "",
    description: "",
    trip_id: "",
    vehicle_id: "",
    driver_id: "",
    expense_date: "",
  });
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const { data: trips = [] } = useQuery({
    queryKey: ["trips", "expense-form-lookup"],
    queryFn: fetchTrips,
  });
  const tripWaybillMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const t of trips) {
      const wb = t.waybill_number ?? t.reference_code ?? null;
      if (t.id && wb) map.set(Number(t.id), wb);
    }
    return map;
  }, [trips]);
  const { data: users = [] } = useQuery({
    queryKey: ["users", "expense-form-lookup"],
    queryFn: fetchUsers,
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles", "expense-form-lookup"],
    queryFn: fetchVehicles,
  });

  const { data: expensesResult, isLoading, isError } = useQuery({
    queryKey: ["expenses", { category, status, search, month }],
    queryFn: () =>
      fetchExpenses({
        category: category !== "all" ? category : undefined,
        status: status !== "all" ? status : undefined,
        q: search || undefined,
        date_from: month ? `${month}-01` : undefined,
        date_to: month
          ? `${month}-${String(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()).padStart(2, "0")}`
          : undefined,
      }),
    refetchInterval: 20_000,
  });

  const expenses = useMemo(() => expensesResult?.items ?? [], [expensesResult?.items]);

  const { data: summary = {} } = useQuery({
    queryKey: ["expenses", "summary", { category, status, search, month }],
    queryFn: () =>
      fetchExpenseSummary({
        category: category !== "all" ? category : undefined,
        status: status !== "all" ? status : undefined,
        q: search || undefined,
        date_from: month ? `${month}-01` : undefined,
        date_to: month
          ? `${month}-${String(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()).padStart(2, "0")}`
          : undefined,
      }),
    refetchInterval: 20_000,
  });

  const refreshExpenses = async () => {
    await queryClient.invalidateQueries({ queryKey: ["expenses"] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: Partial<ExpenseEntry> | FormData) => createExpense(payload),
    onSuccess: async () => {
      setForm({
        category: "other_overheads",
        amount: "",
        description: "",
        trip_id: "",
        vehicle_id: "",
        driver_id: "",
        expense_date: "",
      });
      setReceiptFile(null);
      await refreshExpenses();
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<ExpenseEntry> | FormData }) => updateExpense(id, payload),
    onSuccess: async () => {
      setEditingExpenseId(null);
      setForm({
        category: "other_overheads",
        amount: "",
        description: "",
        trip_id: "",
        vehicle_id: "",
        driver_id: "",
        expense_date: "",
      });
      setReceiptFile(null);
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
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => bulkDeleteExpenses(ids),
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
    mutationFn: () => recalculateFuelExpenses({ target_statuses: ["approved", "paid"] }),
    onSuccess: async (data: unknown) => {
      const payload = (data ?? {}) as Record<string, unknown>;
      const nested = (payload.data ?? payload.job ?? {}) as Record<string, unknown>;
      const jobId = payload.job_id ?? nested.job_id ?? nested.id ?? "-";
      setToast({ kind: "success", message: `Recalculation queued (job_id: ${String(jobId)}).` });
      await refreshExpenses();
    },
    onError: (error: unknown) => {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
          ? (error as { response: { data: { message: string } } }).response.data.message
          : "Fuel recalculation request failed.";
      setToast({ kind: "error", message });
    },
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
      {toast ? (
        <div
          className={`fixed right-4 top-4 z-[70] rounded-lg border px-3 py-2 text-sm shadow-lg ${
            toast.kind === "success"
              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-100"
              : "border-rose-500/40 bg-rose-500/15 text-rose-100"
          }`}
        >
          {toast.message}
        </div>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="ops-section-title">Finance</p>
          <h2 className="text-xl font-semibold">Expenses</h2>
          <p className="text-sm text-muted-foreground">
            Fleet expenses, approvals, automation, and fuel recalculation.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("view")}
            className={`rounded-lg border px-3 py-2 text-xs ${mode === "view" ? "border-primary/40 bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground"}`}
          >
            View Expenses
          </button>
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`rounded-lg border px-3 py-2 text-xs ${mode === "create" ? "border-primary/40 bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground"}`}
          >
            {editingExpenseId ? "Edit Expense" : "Create Expense"}
          </button>
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

      {mode === "view" ? (
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
      ) : null}

      {mode === "view" ? (
      <section className="ops-card p-4">
        <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_0.9fr]">
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
            {EXPENSE_CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
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
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary"
            aria-label="Filter expenses by month"
          />
        </div>
      </section>
      ) : null}

      {mode === "create" ? (
      <section className="ops-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Create Expense</h3>
        </div>
        <form
          className="grid gap-3 md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            const payload: Partial<ExpenseEntry> = {
              category: form.category,
              amount: Number(form.amount),
              description: form.description || undefined,
              trip_id: form.trip_id ? Number(form.trip_id) : undefined,
              vehicle_id: form.vehicle_id ? Number(form.vehicle_id) : undefined,
              driver_id: form.driver_id ? Number(form.driver_id) : undefined,
              expense_date: form.expense_date || undefined,
            };
            const multipartKeys = new Set(["receipt", "receipt_file", "file"]);
            const multipartPayload = new FormData();
            Object.entries(payload).forEach(([key, value]) => {
              if (value !== undefined && value !== null) multipartPayload.append(key, String(value));
            });
            if (receiptFile) {
              multipartKeys.forEach((key) => multipartPayload.append(key, receiptFile));
            }
            if (editingExpenseId) {
              updateMutation.mutate({
                id: editingExpenseId,
                payload: receiptFile ? multipartPayload : payload,
              });
              return;
            }
            createMutation.mutate(receiptFile ? multipartPayload : payload);
          }}
        >
          <select
            value={form.category}
            onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as ExpenseCategory }))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary"
          >
            {EXPENSE_CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
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
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary md:col-span-2"
          />
          {receiptFile ? (
            <p className="text-xs text-muted-foreground md:col-span-3">Receipt selected: {receiptFile.name}</p>
          ) : null}
          <button
            type="submit"
            className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {editingExpenseId
              ? updateMutation.isPending
                ? "Saving..."
                : "Save Changes"
              : createMutation.isPending
              ? "Creating..."
              : "Create"}
          </button>
          {editingExpenseId ? (
            <button
              type="button"
              onClick={() => {
                setEditingExpenseId(null);
                setForm({
                  category: "other_overheads",
                  amount: "",
                  description: "",
                  trip_id: "",
                  vehicle_id: "",
                  driver_id: "",
                  expense_date: "",
                });
                setReceiptFile(null);
              }}
              className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground"
            >
              Cancel Edit
            </button>
          ) : null}
        </form>
      </section>
      ) : null}

      {mode === "view" && selected.size > 0 ? (
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
              onClick={() => {
                if (!window.confirm(`Delete ${selected.size} selected expense${selected.size === 1 ? "" : "s"}? This cannot be undone.`)) return;
                bulkDeleteMutation.mutate(selectedIds);
              }}
              className="inline-flex items-center gap-1 rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-300"
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? "Deleting..." : "Delete"}
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

      {mode === "view" ? (isLoading ? (
        <div className="ops-card p-6 text-sm text-muted-foreground">Loading expenses...</div>
      ) : isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">
          Unable to load expenses.
        </div>
      ) : (
        <section className="ops-card overflow-hidden">
          <div className="space-y-2 p-3 md:hidden">
            {expenses.length === 0 ? (
              <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                No expenses found.
              </div>
            ) : (
              expenses.map((row) => (
                <article key={`mobile-${row.id}`} className="rounded-lg border border-border bg-card p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="font-semibold text-foreground">{getExpenseCategoryLabel(row.category)}</p>
                    <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${statusClasses(row.status)}`}>
                      {row.status ?? "draft"}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Description</span>
                      <span className="text-right text-foreground">{row.description ?? "-"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="text-right font-semibold text-foreground">
                        {formatCurrency(asNumber(row.amount), row.currency ?? "GHS")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Trip / Vehicle / Driver</span>
                      <span className="text-right text-foreground">
                        {row.trip_id ?? "-"}{row.trip_id && tripWaybillMap.get(Number(row.trip_id)) ? ` (${tripWaybillMap.get(Number(row.trip_id))})` : ""} / {row.vehicle_id ?? "-"} / {row.driver_id ?? "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Date</span>
                      <span className="text-right text-foreground">{formatDate(row.expense_date ?? row.created_at ?? undefined)}</span>
                    </div>
                  </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingExpenseId(row.id);
                          setMode("create");
                          setForm({
                            category: (row.category as ExpenseCategory) ?? "other_overheads",
                            amount: String(asNumber(row.amount)),
                            description: row.description ?? "",
                            trip_id: row.trip_id ? String(row.trip_id) : "",
                            vehicle_id: row.vehicle_id ? String(row.vehicle_id) : "",
                            driver_id: row.driver_id ? String(row.driver_id) : "",
                            expense_date: row.expense_date ? String(row.expense_date).slice(0, 16) : "",
                          });
                        }}
                        className="rounded border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => submitMutation.mutate(row.id)}
                      className="rounded border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground"
                    >
                      Submit
                    </button>
                    <button
                      type="button"
                      onClick={() => approveMutation.mutate(row.id)}
                      className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => markPaidMutation.mutate(row.id)}
                      className="rounded border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[11px] text-sky-300"
                    >
                      Paid
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
          <div className="hidden overflow-x-auto md:block">
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
                      <td className="px-4 py-3 font-semibold text-foreground">{getExpenseCategoryLabel(row.category)}</td>
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
                        <p>Trip: {row.trip_id ?? "-"}{row.trip_id && tripWaybillMap.get(Number(row.trip_id)) ? <span className="ml-1 font-mono text-foreground">({tripWaybillMap.get(Number(row.trip_id))})</span> : null}</p>
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
                            onClick={() => {
                              setEditingExpenseId(row.id);
                              setMode("create");
                              setForm({
                                category: (row.category as ExpenseCategory) ?? "other_overheads",
                                amount: String(asNumber(row.amount)),
                                description: row.description ?? "",
                                trip_id: row.trip_id ? String(row.trip_id) : "",
                                vehicle_id: row.vehicle_id ? String(row.vehicle_id) : "",
                                driver_id: row.driver_id ? String(row.driver_id) : "",
                                expense_date: row.expense_date ? String(row.expense_date).slice(0, 16) : "",
                              });
                            }}
                            className="rounded border border-border bg-card px-2 py-1 text-xs text-muted-foreground"
                          >
                            Edit
                          </button>
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
      )) : null}

      {mode === "view" ? (
      <section className="ops-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Summary by Category</h3>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {Object.entries(
            (summary.by_category as Record<string, number>) ??
              (summary.categories as Record<string, number>) ??
              {}
          ).map(([key, value]) => (
            <article key={key} className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{getExpenseCategoryLabel(key)}</p>
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
      ) : null}

      {mode === "view" ? (
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
      ) : null}
    </div>
  );
}
