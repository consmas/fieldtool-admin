export function formatDate(value?: string | number | Date) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDistanceKm(value?: number | null) {
  if (value === null || value === undefined) return "-";
  return `${value.toFixed(1)} km`;
}

export function formatOdometer(value?: number | null) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("en-US").format(value);
}
