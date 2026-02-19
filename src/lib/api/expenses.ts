import { apiClient } from "@/lib/api/client";

export type ExpenseCategory =
  | "insurance"
  | "registration_licensing"
  | "taxes_levies"
  | "road_expenses"
  | "fuel"
  | "repairs_maintenance"
  | "fleet_staff_costs"
  | "bank_charges"
  | "other_overheads";

export type ExpenseStatus = "draft" | "pending" | "approved" | "rejected" | "paid";

export interface ExpenseEntry {
  id: number;
  trip_id?: number | null;
  vehicle_id?: number | null;
  driver_id?: number | null;
  category: ExpenseCategory | string;
  subcategory?: string | null;
  description?: string | null;
  quantity?: number | null;
  unit_cost?: number | null;
  amount: number | string;
  currency?: string | null;
  status?: ExpenseStatus | string | null;
  expense_date?: string | null;
  payment_method?: string | null;
  reference?: string | null;
  vendor_name?: string | null;
  receipt_url?: string | null;
  is_auto_generated?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  trip?: { id: number; waybill_number?: string | null; reference_code?: string | null } | null;
  vehicle?: { id: number; name?: string | null; license_plate?: string | null } | null;
  driver?: { id: number; name?: string | null } | null;
}

export interface ExpenseSummary {
  total_expense?: number;
  total?: number;
  by_category?: Record<string, number>;
  categories?: Record<string, number>;
  by_status?: Record<string, number>;
  statuses?: Record<string, number>;
  pending_total?: number;
  approved_total?: number;
  paid_total?: number;
  [key: string]: unknown;
}

export interface ExpenseListResult {
  items: ExpenseEntry[];
  meta?: Record<string, unknown>;
}

export interface FetchExpensesParams {
  page?: number;
  per_page?: number;
  category?: string;
  status?: string;
  q?: string;
  trip_id?: number;
  vehicle_id?: number;
  driver_id?: number;
}

function normalizeListPayload(data: unknown): ExpenseListResult {
  if (Array.isArray(data)) return { items: data as ExpenseEntry[] };
  if (!data || typeof data !== "object") return { items: [] };

  const payload = data as Record<string, unknown>;
  const items =
    (Array.isArray(payload.data) && payload.data) ||
    (Array.isArray(payload.expenses) && payload.expenses) ||
    (Array.isArray(payload.items) && payload.items) ||
    [];
  const meta = (payload.meta as Record<string, unknown> | undefined) ?? undefined;
  return { items: items as ExpenseEntry[], meta };
}

export async function fetchExpenses(params: FetchExpensesParams): Promise<ExpenseListResult> {
  const { data } = await apiClient.get("/expenses", { params });
  return normalizeListPayload(data);
}

export async function createExpense(payload: Partial<ExpenseEntry>) {
  const { data } = await apiClient.post("/expenses", payload);
  return data;
}

export async function updateExpense(id: number, payload: Partial<ExpenseEntry>) {
  const { data } = await apiClient.patch(`/expenses/${id}`, payload);
  return data;
}

export async function deleteExpense(id: number) {
  const { data } = await apiClient.delete(`/expenses/${id}`);
  return data;
}

export async function submitExpense(id: number) {
  const { data } = await apiClient.post(`/expenses/${id}/submit`, {});
  return data;
}

export async function approveExpense(id: number) {
  const { data } = await apiClient.post(`/expenses/${id}/approve`, {});
  return data;
}

export async function rejectExpense(id: number, reason: string) {
  const { data } = await apiClient.post(`/expenses/${id}/reject`, { reason });
  return data;
}

export async function markExpensePaid(id: number) {
  const { data } = await apiClient.post(`/expenses/${id}/mark-paid`, {});
  return data;
}

async function runBulkAction(endpoint: string, ids: number[]) {
  const { data } = await apiClient.post(endpoint, {
    ids,
    expense_ids: ids,
  });
  return data;
}

export async function bulkApproveExpenses(ids: number[]) {
  return runBulkAction("/expenses/bulk/approve", ids);
}

export async function bulkRejectExpenses(ids: number[], reason: string) {
  const { data } = await apiClient.post("/expenses/bulk/reject", {
    ids,
    expense_ids: ids,
    reason,
  });
  return data;
}

export async function bulkMarkPaidExpenses(ids: number[]) {
  return runBulkAction("/expenses/bulk/mark-paid", ids);
}

export async function fetchExpenseSummary(params?: Omit<FetchExpensesParams, "page" | "per_page">): Promise<ExpenseSummary> {
  const { data } = await apiClient.get("/expenses/summary", { params });
  if (data && typeof data === "object" && "data" in (data as Record<string, unknown>)) {
    return ((data as Record<string, unknown>).data as ExpenseSummary) ?? {};
  }
  return (data as ExpenseSummary) ?? {};
}

export async function syncRoadFeeAutomation() {
  const { data } = await apiClient.post("/expenses/automation/road-fee/sync", {});
  return data;
}

export async function recalculateFuelExpenses(payload?: { trip_ids?: number[] }) {
  const { data } = await apiClient.post("/expenses/fuel/recalculate", payload ?? {});
  return data;
}
