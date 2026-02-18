export const EXPENSE_CATEGORY_OPTIONS = [
  { value: "insurance", label: "Insurance" },
  { value: "registration_licensing", label: "Registration & Licensing" },
  { value: "taxes_levies", label: "Taxes and Levies" },
  { value: "road_expenses", label: "Road Expenses" },
  { value: "fuel", label: "Fuel" },
  { value: "repairs_maintenance", label: "Repairs and Maintenance" },
  { value: "fleet_staff_costs", label: "Fleet Staff Costs" },
  { value: "bank_charges", label: "Bank Charges" },
  { value: "other_overheads", label: "Other Overheads" },
] as const;

export type ExpenseCategoryKey = (typeof EXPENSE_CATEGORY_OPTIONS)[number]["value"];

const LABEL_MAP: Record<string, string> = Object.fromEntries(
  EXPENSE_CATEGORY_OPTIONS.map((item) => [item.value, item.label])
);

export function getExpenseCategoryLabel(key: string | null | undefined) {
  if (!key) return "Unknown";
  return LABEL_MAP[key] ?? "Unknown";
}
