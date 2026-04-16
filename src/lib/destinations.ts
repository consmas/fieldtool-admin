import axios from "axios";
import type { Destination } from "@/types/api";
import type { DestinationPayload } from "@/lib/api/destinations";

export type DestinationRateMode = "system" | "manual";

export type DestinationFormValues = {
  name: string;
  average_distance_km: string;
  base_price_per_ton: string;
  tons_per_trip: string;
  base_km: string;
  base_trip_cost: string;
  kms_per_liter: string;
  liters_per_km: string;
  fuel_price_ref: string;
  additional_provision_pct: string;
  active: string;
};

export const destinationFormDefaults: DestinationFormValues = {
  name: "",
  average_distance_km: "",
  base_price_per_ton: "",
  tons_per_trip: "",
  base_km: "",
  base_trip_cost: "",
  kms_per_liter: "",
  liters_per_km: "",
  fuel_price_ref: "",
  additional_provision_pct: "",
  active: "true",
};

function toFormValue(value: number | string | boolean | null | undefined): string {
  if (value == null) return "";
  if (typeof value === "boolean") return String(value);
  return String(value);
}

function toNumberOrUndefined(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function destinationToFormValues(destination: Partial<Destination>): DestinationFormValues {
  return {
    name: toFormValue(destination.name),
    average_distance_km: toFormValue(destination.average_distance_km),
    base_price_per_ton: toFormValue(destination.base_price_per_ton),
    tons_per_trip: toFormValue(destination.tons_per_trip),
    base_km: toFormValue(destination.base_km),
    base_trip_cost: toFormValue(destination.base_trip_cost),
    kms_per_liter: toFormValue(destination.kms_per_liter),
    liters_per_km: toFormValue(destination.liters_per_km),
    fuel_price_ref: toFormValue(destination.fuel_price_ref),
    additional_provision_pct: toFormValue(destination.additional_provision_pct),
    active: destination.active == null ? "true" : String(destination.active),
  };
}

export function inferDestinationRateMode(destination: Partial<Destination>): DestinationRateMode {
  const averageDistance = Number(destination.average_distance_km ?? 0);
  const baseKm = Number(destination.base_km ?? 0);

  if (averageDistance > 0 && baseKm >= averageDistance) {
    return "manual";
  }

  return "system";
}

export function buildDestinationPayload(
  form: DestinationFormValues,
  mode: DestinationRateMode
): DestinationPayload {
  const averageDistance = toNumberOrUndefined(form.average_distance_km);
  const baseKm = toNumberOrUndefined(form.base_km);
  const baseTripCost = toNumberOrUndefined(form.base_trip_cost);

  return {
    name: form.name.trim(),
    average_distance_km: averageDistance,
    base_price_per_ton: toNumberOrUndefined(form.base_price_per_ton),
    tons_per_trip: toNumberOrUndefined(form.tons_per_trip),
    base_km: mode === "manual" ? averageDistance : baseKm,
    base_trip_cost: baseTripCost,
    kms_per_liter: toNumberOrUndefined(form.kms_per_liter),
    liters_per_km: toNumberOrUndefined(form.liters_per_km),
    fuel_price_ref: toNumberOrUndefined(form.fuel_price_ref),
    additional_provision_pct: toNumberOrUndefined(form.additional_provision_pct),
    active: form.active === "true",
  };
}

export function validateDestinationForm(
  form: DestinationFormValues,
  mode: DestinationRateMode
): string | null {
  if (form.name.trim() === "") return "Name can't be blank";
  if (form.average_distance_km.trim() === "") return "Average distance can't be blank";

  if (mode === "manual") {
    if (form.base_trip_cost.trim() === "") return "Manual Rate can't be blank";
    return null;
  }

  if (form.base_km.trim() === "") return "Base KM can't be blank";
  if (form.base_trip_cost.trim() === "") return "Base Rate can't be blank";
  if (form.liters_per_km.trim() === "" && form.kms_per_liter.trim() === "") {
    return "Enter liters per km or kms per liter for system calculation";
  }

  return null;
}

export function canPreviewDestination(form: DestinationFormValues, mode: DestinationRateMode): boolean {
  if (mode !== "system") return false;
  if (form.average_distance_km.trim() === "") return false;
  if (form.base_km.trim() === "") return false;
  if (form.base_trip_cost.trim() === "") return false;
  return form.liters_per_km.trim() !== "" || form.kms_per_liter.trim() !== "";
}

function flattenValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(flattenValues);
  if (value && typeof value === "object") return Object.values(value).flatMap(flattenValues);
  return [];
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;
  const status = error.response?.status;
  const data = error.response?.data;

  if (status === 422) {
    if (typeof data === "string") return data;
    if (Array.isArray(data)) return data.map(String).join("\n");
    if (data && typeof data === "object") {
      const errors = (data as { errors?: unknown; error?: unknown; message?: unknown }).errors;
      if (typeof errors === "string") return errors;
      if (Array.isArray(errors)) return errors.map(String).join("\n");

      const directError = (data as { error?: unknown }).error;
      if (typeof directError === "string") return directError;

      const directMessage = (data as { message?: unknown }).message;
      if (typeof directMessage === "string") return directMessage;

      const flattened = flattenValues(data);
      if (flattened.length > 0) return flattened.join("\n");

      return JSON.stringify(data);
    }
  }

  return fallback;
}
