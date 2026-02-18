"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import type { Destination, Trip, TripStop, User, Vehicle } from "@/types/api";

const emptyForm: Partial<Trip> & {
  driver_id?: number | null;
  vehicle_id?: number | null;
  stops?: TripStop[];
} = {
  status: "assigned",
  trip_date: "",
  driver_id: null,
  driver_contact: "",
  vehicle_id: null,
  truck_reg_no: "",
  truck_type_capacity: "",
  client_name: "",
  waybill_number: "",
  destination: "",
  delivery_address: "",
  delivery_place_id: "",
  delivery_lat: null,
  delivery_lng: null,
  delivery_map_url: "",
  delivery_location_source: "manual",
  tonnage_load: "",
  customer_contact_name: "",
  customer_contact_phone: "",
  special_instructions: "",
  stops: [],
};

function toInputDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function todayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

declare global {
  interface Window {
    __gmapsOptionsSet?: boolean;
  }
}

type ParsedSharedLocation = {
  address?: string;
  lat?: number;
  lng?: number;
  mapUrl?: string;
  placeId?: string;
};

function parseLatLngText(input: string): { lat: number; lng: number } | null {
  const match = input.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function parseGoogleSharedLocation(input: string): ParsedSharedLocation | null {
  const value = input.trim();
  if (!value) return null;

  if (!/^https?:\/\//i.test(value)) {
    const coords = parseLatLngText(value);
    if (coords) return { ...coords, mapUrl: `https://www.google.com/maps?q=${coords.lat},${coords.lng}` };
    return { address: value };
  }

  try {
    const url = new URL(value);
    const result: ParsedSharedLocation = { mapUrl: value };

    const query = url.searchParams.get("q") || url.searchParams.get("query");
    if (query) {
      const decoded = decodeURIComponent(query).replace(/\+/g, " ");
      const coords = parseLatLngText(decoded);
      if (coords) {
        result.lat = coords.lat;
        result.lng = coords.lng;
      } else {
        result.address = decoded;
      }
    }

    const placeId =
      url.searchParams.get("query_place_id") ||
      url.searchParams.get("place_id") ||
      undefined;
    if (placeId) result.placeId = placeId;

    const placeMatch = url.pathname.match(/\/place\/([^/]+)/i);
    if (placeMatch?.[1] && !result.address) {
      result.address = decodeURIComponent(placeMatch[1]).replace(/\+/g, " ");
    }

    const atMatch = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (atMatch) {
      const lat = Number(atMatch[1]);
      const lng = Number(atMatch[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        result.lat = lat;
        result.lng = lng;
      }
    }

    if (!result.address && result.lat !== undefined && result.lng !== undefined) {
      result.address = `${result.lat}, ${result.lng}`;
    }

    return Object.keys(result).length ? result : null;
  } catch {
    return null;
  }
}

function isGoogleShortMapsUrl(input: string): boolean {
  try {
    const url = new URL(input.trim());
    return (
      url.hostname === "maps.app.goo.gl" ||
      url.hostname === "goo.gl" ||
      url.hostname.endsWith(".goo.gl")
    );
  } catch {
    return false;
  }
}

function hasCoords(lat?: number | null, lng?: number | null) {
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function toMapsUrl(trip: Partial<Trip>) {
  if (trip.delivery_map_url) return trip.delivery_map_url;
  if (hasCoords(trip.delivery_lat, trip.delivery_lng)) {
    return `https://www.google.com/maps?q=${trip.delivery_lat},${trip.delivery_lng}`;
  }
  return null;
}

export interface TripFormProps {
  users: User[];
  vehicles: Vehicle[];
  destinations?: Destination[];
  initialTrip?: Trip | null;
  submitLabel: string;
  onSubmit: (payload: Partial<Trip> & { stops?: TripStop[] }) => void;
  message?: string | null;
  onCancel?: () => void;
}

export default function TripForm({
  users,
  vehicles,
  destinations = [],
  initialTrip,
  submitLabel,
  onSubmit,
  message,
  onCancel,
}: TripFormProps) {
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const mapPreviewRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const markerListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const mapClickListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  const [form, setForm] = useState(() => {
    if (!initialTrip) return { ...emptyForm, trip_date: todayInputDate() };
    return {
      status: initialTrip.status ?? "assigned",
      trip_date: toInputDate(initialTrip.trip_date) || todayInputDate(),
      driver_id: initialTrip.driver?.id ?? initialTrip.driver_id ?? null,
      driver_contact: initialTrip.driver_contact ?? initialTrip.driver?.phone_number ?? "",
      vehicle_id: initialTrip.vehicle_id ?? initialTrip.truck_id ?? null,
      truck_reg_no: initialTrip.truck_reg_no ?? initialTrip.vehicle?.license_plate ?? "",
      truck_type_capacity:
        initialTrip.truck_type_capacity ?? initialTrip.vehicle?.truck_type_capacity ?? "",
      client_name: initialTrip.client_name ?? "",
      waybill_number: initialTrip.waybill_number ?? initialTrip.reference_code ?? "",
      destination: initialTrip.destination ?? initialTrip.dropoff_location ?? "",
      delivery_address: initialTrip.delivery_address ?? "",
      delivery_place_id: initialTrip.delivery_place_id ?? "",
      delivery_lat: initialTrip.delivery_lat ?? null,
      delivery_lng: initialTrip.delivery_lng ?? null,
      delivery_map_url: initialTrip.delivery_map_url ?? "",
      delivery_location_source: initialTrip.delivery_location_source ?? "manual",
      tonnage_load: initialTrip.tonnage_load ?? "",
      customer_contact_name: initialTrip.customer_contact_name ?? "",
      customer_contact_phone: initialTrip.customer_contact_phone ?? "",
      special_instructions: initialTrip.special_instructions ?? "",
      stops: [],
    };
  });

  const [locationSource, setLocationSource] = useState("");
  const [locating, setLocating] = useState(false);
  const [resolvingShared, setResolvingShared] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<
    Array<{
      placeId: string;
      description: string;
      lat?: number;
      lng?: number;
      mapUrl?: string;
      source?: "places_textsearch" | "geocode";
    }>
  >([]);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const drivers = useMemo(() => users.filter((u) => u.role === "driver"), [users]);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === form.vehicle_id) ?? null,
    [vehicles, form.vehicle_id]
  );

  const selectedDriver = useMemo(
    () => drivers.find((d) => d.id === form.driver_id) ?? null,
    [drivers, form.driver_id]
  );

  const selectedDestination = useMemo(
    () => destinations.find((d) => d.name === form.destination) ?? null,
    [destinations, form.destination]
  );

  useEffect(() => {
    if (!mapsApiKey || typeof window === "undefined") return;

    let mounted = true;

    const init = async () => {
      if (!window.__gmapsOptionsSet) {
        setOptions({ key: mapsApiKey, v: "weekly" });
        window.__gmapsOptionsSet = true;
      }

      await importLibrary("maps");
      if (!mounted || !mapPreviewRef.current) return;

      const hasInitialCoords = hasCoords(form.delivery_lat, form.delivery_lng);
      const center = hasInitialCoords
        ? { lat: Number(form.delivery_lat), lng: Number(form.delivery_lng) }
        : { lat: 5.6037, lng: -0.187 }; // Accra fallback

      if (!mapRef.current) {
        mapRef.current = new google.maps.Map(mapPreviewRef.current, {
          center,
          zoom: hasInitialCoords ? 15 : 7,
        });
      }

      if (!markerRef.current) {
        markerRef.current = new google.maps.Marker({
          map: mapRef.current,
          position: center,
          draggable: true,
        });
      }

      if (markerListenerRef.current) {
        google.maps.event.removeListener(markerListenerRef.current);
      }
      markerListenerRef.current = markerRef.current.addListener("dragend", () => {
        const pos = markerRef.current?.getPosition();
        if (!pos) return;
        const lat = pos.lat();
        const lng = pos.lng();
        setForm((prev) => ({
          ...prev,
          delivery_lat: lat,
          delivery_lng: lng,
          delivery_map_url: `https://www.google.com/maps?q=${lat},${lng}`,
          delivery_location_source: "manual",
        }));
      });

      if (mapClickListenerRef.current) {
        google.maps.event.removeListener(mapClickListenerRef.current);
      }
      mapClickListenerRef.current = mapRef.current.addListener(
        "click",
        (event: google.maps.MapMouseEvent) => {
          if (!event.latLng || !markerRef.current || !mapRef.current) return;
          markerRef.current.setPosition(event.latLng);
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          mapRef.current.panTo({ lat, lng });
          setForm((prev) => ({
            ...prev,
            delivery_lat: lat,
            delivery_lng: lng,
            delivery_map_url: `https://www.google.com/maps?q=${lat},${lng}`,
            delivery_location_source: "manual",
          }));
        }
      );
    };

    init().catch(() => {
      mapRef.current = null;
      markerRef.current = null;
    });

    return () => {
      mounted = false;
    };
  }, [mapsApiKey]);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    if (!hasCoords(form.delivery_lat, form.delivery_lng)) return;
    const next = { lat: Number(form.delivery_lat), lng: Number(form.delivery_lng) };
    markerRef.current.setPosition(next);
    mapRef.current.panTo(next);
  }, [form.delivery_lat, form.delivery_lng]);

  useEffect(() => {
    const query = (form.delivery_address ?? "").trim();
    if (query.length < 3 || !mapsApiKey) {
      setAddressSuggestions([]);
      return;
    }

    const timeout = setTimeout(() => {
      setIsSuggesting(true);
      fetch(`/api/maps/search?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data) => {
          setIsSuggesting(false);
          const results = Array.isArray(data?.suggestions) ? data.suggestions : [];
          if (!results.length) {
            setAddressSuggestions([]);
            return;
          }

          setAddressSuggestions(
            results.slice(0, 8).map((item: any) => ({
              placeId: String(item.placeId ?? ""),
              description: String(item.description ?? ""),
              lat: Number(item.lat),
              lng: Number(item.lng),
              mapUrl: item.mapUrl ? String(item.mapUrl) : undefined,
              source: item.source,
            }))
          );
        })
        .catch(() => {
          setIsSuggesting(false);
          setAddressSuggestions([]);
        });
    }, 250);

    return () => clearTimeout(timeout);
  }, [form.delivery_address, mapsApiKey]);

  const selectPrediction = (item: {
    placeId: string;
    description: string;
    lat?: number;
    lng?: number;
    mapUrl?: string;
  }) => {
    setForm((prev) => ({
      ...prev,
      delivery_address: item.description,
      delivery_place_id: item.placeId,
      delivery_lat: Number.isFinite(item.lat) ? Number(item.lat) : null,
      delivery_lng: Number.isFinite(item.lng) ? Number(item.lng) : null,
      delivery_map_url:
        item.mapUrl ||
        (Number.isFinite(item.lat) && Number.isFinite(item.lng)
          ? `https://www.google.com/maps?q=${item.lat},${item.lng}`
          : prev.delivery_map_url),
      delivery_location_source: "google_autocomplete",
    }));
    setAddressSuggestions([]);
    setLocationMessage("Delivery location selected from search results.");
  };

  const applySharedLocation = async () => {
    const source = locationSource.trim();
    const parsed = parseGoogleSharedLocation(source);

    if (parsed?.address || hasCoords(parsed?.lat, parsed?.lng)) {
      setForm((prev) => ({
        ...prev,
        delivery_address: parsed?.address || prev.delivery_address,
        delivery_place_id: parsed?.placeId || prev.delivery_place_id,
        delivery_lat: parsed?.lat ?? prev.delivery_lat ?? null,
        delivery_lng: parsed?.lng ?? prev.delivery_lng ?? null,
        delivery_map_url: parsed?.mapUrl || source,
        delivery_location_source: "shared_link",
      }));
      setLocationMessage("Delivery location auto-filled from shared link.");
      return;
    }

    if (isGoogleShortMapsUrl(source)) {
      setResolvingShared(true);
      setLocationMessage(null);
      try {
        const response = await fetch(`/api/maps/resolve?url=${encodeURIComponent(source)}`);
        const data = (await response.json()) as {
          address?: string;
          lat?: number;
          lng?: number;
          map_url?: string;
          final_url?: string;
          error?: string;
        };

        if (response.ok && (data.address || hasCoords(data.lat, data.lng))) {
          setForm((prev) => ({
            ...prev,
            delivery_address: data.address || prev.delivery_address,
            delivery_lat: data.lat ?? prev.delivery_lat ?? null,
            delivery_lng: data.lng ?? prev.delivery_lng ?? null,
            delivery_map_url: data.map_url || data.final_url || source,
            delivery_location_source: "shared_link",
          }));
          setLocationMessage("Delivery location auto-filled from shared link.");
        } else {
          setLocationMessage(
            data.error ||
              "Could not read this shortened Google Maps link. Open it and copy full location details."
          );
        }
      } catch {
        setLocationMessage("Could not resolve this Google Maps short link right now.");
      } finally {
        setResolvingShared(false);
      }
      return;
    }

    setLocationMessage("Could not read a valid Google Maps shared location.");
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage("Geolocation is not available in this browser.");
      return;
    }

    setLocating(true);
    setLocationMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        try {
          if (mapsApiKey) {
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${mapsApiKey}`
            );
            const data = await response.json();
            const resolvedAddress = data?.results?.[0]?.formatted_address;

            setForm((prev) => ({
              ...prev,
              delivery_address: resolvedAddress || `${lat}, ${lng}`,
              delivery_lat: lat,
              delivery_lng: lng,
              delivery_place_id: data?.results?.[0]?.place_id || prev.delivery_place_id || "",
              delivery_map_url: `https://www.google.com/maps?q=${lat},${lng}`,
              delivery_location_source: "geolocation",
            }));
            setLocationMessage(
              resolvedAddress
                ? "Delivery location set from your current location."
                : "Coordinates captured. Address lookup unavailable."
            );
          } else {
            setForm((prev) => ({
              ...prev,
              delivery_address: `${lat}, ${lng}`,
              delivery_lat: lat,
              delivery_lng: lng,
              delivery_map_url: `https://www.google.com/maps?q=${lat},${lng}`,
              delivery_location_source: "geolocation",
            }));
            setLocationMessage("Coordinates captured.");
          }
        } catch {
          setForm((prev) => ({
            ...prev,
            delivery_address: `${lat}, ${lng}`,
            delivery_lat: lat,
            delivery_lng: lng,
            delivery_map_url: `https://www.google.com/maps?q=${lat},${lng}`,
            delivery_location_source: "geolocation",
          }));
          setLocationMessage("Coordinates captured. Address lookup failed.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setLocationMessage("Unable to read your current location.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const updateStop = (index: number, patch: Partial<TripStop>) => {
    setForm((prev) => {
      const stops = [...(prev.stops ?? [])];
      stops[index] = { ...stops[index], ...patch };
      return { ...prev, stops };
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    const lat = form.delivery_lat;
    const lng = form.delivery_lng;
    const hasLat = lat !== null && lat !== undefined && lat !== ("" as never);
    const hasLng = lng !== null && lng !== undefined && lng !== ("" as never);

    if (hasLat !== hasLng) {
      setSubmitError("Both delivery latitude and longitude are required when one is provided.");
      return;
    }

    if (hasLat && hasLng) {
      if (Number(lat) < -90 || Number(lat) > 90) {
        setSubmitError("Delivery latitude must be between -90 and 90.");
        return;
      }
      if (Number(lng) < -180 || Number(lng) > 180) {
        setSubmitError("Delivery longitude must be between -180 and 180.");
        return;
      }
    }

    const payload: Partial<Trip> & { stops?: TripStop[] } = {
      status: form.status || undefined,
      trip_date: form.trip_date ? new Date(form.trip_date).toISOString() : undefined,
      driver_id: form.driver_id ?? undefined,
      vehicle_id: form.vehicle_id ?? undefined,
      truck_reg_no: selectedVehicle?.license_plate ?? form.truck_reg_no ?? undefined,
      driver_contact: (selectedDriver?.phone_number ?? form.driver_contact) || undefined,
      truck_type_capacity:
        (selectedVehicle?.truck_type_capacity ?? form.truck_type_capacity) || undefined,
      client_name: form.client_name || undefined,
      waybill_number: form.waybill_number || undefined,
      reference_code: form.waybill_number || undefined,
      destination: form.destination || undefined,
      delivery_address: form.delivery_address || undefined,
      delivery_place_id: form.delivery_place_id || undefined,
      delivery_lat: hasLat ? Number(form.delivery_lat) : undefined,
      delivery_lng: hasLng ? Number(form.delivery_lng) : undefined,
      delivery_map_url: form.delivery_map_url || undefined,
      delivery_location_source: form.delivery_location_source || undefined,
      tonnage_load: form.tonnage_load || undefined,
      customer_contact_name: form.customer_contact_name || undefined,
      customer_contact_phone: form.customer_contact_phone || undefined,
      special_instructions: form.special_instructions || undefined,
      stops: form.stops?.filter((stop) => stop.destination || stop.waybill_number),
    };

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="ops-card p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          {submitLabel}
        </h3>
        {onCancel ? (
          <button type="button" className="text-xs text-muted-foreground" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>

      <div className="mt-4 space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Section A • General
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Trip Date</label>
              <input
                type="date"
                value={form.trip_date ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, trip_date: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Status</label>
              <select
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
              >
                <option value="draft">draft</option>
                <option value="assigned">assigned</option>
                <option value="loaded">loaded</option>
                <option value="en_route">en_route</option>
                <option value="arrived">arrived</option>
                <option value="offloaded">offloaded</option>
                <option value="completed">completed</option>
                <option value="cancelled">cancelled</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Vehicle</label>
              <select
                value={form.vehicle_id ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    vehicle_id: event.target.value ? Number(event.target.value) : null,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
              >
                <option value="">Select vehicle</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} ({vehicle.license_plate ?? "N/A"})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Truck Reg. No.</label>
              <input
                value={selectedVehicle?.license_plate ?? form.truck_reg_no ?? ""}
                readOnly
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Driver</label>
              <select
                value={form.driver_id ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    driver_id: event.target.value ? Number(event.target.value) : null,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
              >
                <option value="">Select driver</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name ?? driver.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Driver Contact</label>
              <input
                value={selectedDriver?.phone_number ?? form.driver_contact ?? ""}
                readOnly
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Truck Type / Capacity
              </label>
              <input
                value={selectedVehicle?.truck_type_capacity ?? ""}
                readOnly
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground"
              />
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Section B • Delivery Details
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Client Name</label>
              <input
                value={form.client_name ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, client_name: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Waybill No.</label>
              <input
                value={form.waybill_number ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, waybill_number: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Destination</label>
              <select
                value={selectedDestination?.name ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, destination: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
              >
                <option value="">Select destination</option>
                {destinations.map((dest) => (
                  <option key={dest.id} value={dest.name}>
                    {dest.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Google Maps Shared Location
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  value={locationSource}
                  onChange={(event) => setLocationSource(event.target.value)}
                  placeholder="Paste Google Maps share link"
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={applySharedLocation}
                  disabled={resolvingShared}
                  className="rounded-xl border border-border px-3 py-2 text-xs"
                >
                  {resolvingShared ? "Resolving..." : "Apply"}
                </button>
                <button
                  type="button"
                  onClick={useCurrentLocation}
                  disabled={locating}
                  className="rounded-xl border border-border px-3 py-2 text-xs"
                >
                  {locating ? "Locating..." : "Use My Location"}
                </button>
              </div>
              {locationMessage ? <p className="mt-1 text-xs text-muted-foreground">{locationMessage}</p> : null}
            </div>

            <div className="md:col-span-2">
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Delivery Address</label>
              <input
                value={form.delivery_address ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    delivery_address: event.target.value,
                    delivery_place_id: "",
                    delivery_lat: null,
                    delivery_lng: null,
                    delivery_map_url: "",
                    delivery_location_source: "manual",
                  }))
                }
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
              {isSuggesting ? (
                <p className="mt-1 text-xs text-muted-foreground">Searching Ghana locations...</p>
              ) : null}
              {addressSuggestions.length > 0 ? (
                <div className="mt-2 max-h-44 overflow-auto rounded-xl border border-border bg-card">
                  {addressSuggestions.map((item) => (
                    <button
                      key={item.placeId}
                      type="button"
                      onClick={() => selectPrediction(item)}
                      className="block w-full border-b border-border px-3 py-2 text-left text-xs last:border-b-0 hover:bg-muted/40"
                    >
                      <span>{item.description}</span>
                      {item.source === "places_textsearch" ? (
                        <span className="ml-2 rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          business
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Delivery Lat</label>
              <input
                value={form.delivery_lat ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    delivery_lat: event.target.value ? Number(event.target.value) : null,
                    delivery_location_source: "manual",
                  }))
                }
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Delivery Lng</label>
              <input
                value={form.delivery_lng ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    delivery_lng: event.target.value ? Number(event.target.value) : null,
                    delivery_location_source: "manual",
                  }))
                }
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
            </div>

            <div className="md:col-span-2 rounded-xl border border-border bg-muted/20 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Location source: {form.delivery_location_source ?? "manual"}
                </p>
                {toMapsUrl(form) ? (
                  <a
                    href={toMapsUrl(form) ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-border px-2 py-1 text-xs"
                  >
                    Open in Maps
                  </a>
                ) : null}
              </div>
              {hasCoords(form.delivery_lat, form.delivery_lng) ? (
                <div ref={mapPreviewRef} className="mt-3 h-56 w-full rounded-xl border border-border" />
              ) : (
                <div ref={mapPreviewRef} className="mt-3 h-56 w-full rounded-xl border border-border" />
              )}
              {hasCoords(form.delivery_lat, form.delivery_lng) ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Drag marker to fine-tune location.
                </p>
              ) : null}
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Tonnage / Load</label>
              <input
                value={form.tonnage_load ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, tonnage_load: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Customer Contact (Name)
              </label>
              <input
                value={form.customer_contact_name ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, customer_contact_name: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Customer Contact (Phone)
              </label>
              <input
                value={form.customer_contact_phone ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, customer_contact_phone: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Special Instructions
              </label>
              <textarea
                value={form.special_instructions ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, special_instructions: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
                rows={3}
              />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Extra Stops</p>
            <button
              type="button"
              className="rounded-xl border border-border px-3 py-1 text-xs"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  stops: [
                    ...(prev.stops ?? []),
                    {
                      sequence: (prev.stops?.length ?? 0) + 1,
                      destination: "",
                      delivery_address: "",
                      tonnage_load: "",
                      waybill_number: "",
                      customer_contact_name: "",
                      customer_contact_phone: "",
                      special_instructions: "",
                    },
                  ],
                }))
              }
            >
              Add Stop
            </button>
          </div>

          {form.stops && form.stops.length > 0 ? (
            <div className="mt-4 space-y-4">
              {form.stops.map((stop, index) => (
                <div key={index} className="rounded-2xl border border-border bg-muted/20 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground">Stop {index + 1}</p>
                    <button
                      type="button"
                      className="text-xs text-rose-500"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          stops: prev.stops?.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <input
                      placeholder="Destination"
                      value={stop.destination ?? ""}
                      onChange={(event) => updateStop(index, { destination: event.target.value })}
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                    />
                    <input
                      placeholder="Delivery Address"
                      value={stop.delivery_address ?? ""}
                      onChange={(event) => updateStop(index, { delivery_address: event.target.value })}
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                    />
                    <input
                      placeholder="Tonnage / Load"
                      value={stop.tonnage_load ?? ""}
                      onChange={(event) => updateStop(index, { tonnage_load: event.target.value })}
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                    />
                    <input
                      placeholder="Waybill Number"
                      value={stop.waybill_number ?? ""}
                      onChange={(event) => updateStop(index, { waybill_number: event.target.value })}
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                    />
                    <input
                      placeholder="Customer Contact Name"
                      value={stop.customer_contact_name ?? ""}
                      onChange={(event) =>
                        updateStop(index, { customer_contact_name: event.target.value })
                      }
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                    />
                    <input
                      placeholder="Customer Contact Phone"
                      value={stop.customer_contact_phone ?? ""}
                      onChange={(event) =>
                        updateStop(index, { customer_contact_phone: event.target.value })
                      }
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm"
                    />
                    <textarea
                      placeholder="Special Instructions"
                      value={stop.special_instructions ?? ""}
                      onChange={(event) =>
                        updateStop(index, { special_instructions: event.target.value })
                      }
                      className="md:col-span-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">No extra stops added.</p>
          )}
        </div>
      </div>

      {submitError ? (
        <p className="mt-4 rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {submitError}
        </p>
      ) : null}

      {message ? (
        <p className="mt-4 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {message}
        </p>
      ) : null}

      <div className="mt-4 flex gap-3">
        <button
          type="submit"
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
