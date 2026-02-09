"use client";

import { useEffect, useMemo, useRef } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

interface GoogleMapProps {
  lat?: number | string;
  lng?: number | string;
}

let optionsInitialized = false;

function toNumber(value?: number | string) {
  if (value === undefined || value === null) return undefined;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : undefined;
}

export default function GoogleMap({ lat, lng }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
  // Debug log removed for production builds.

  const coords = useMemo(() => {
    const latNum = toNumber(lat);
    const lngNum = toNumber(lng);
    if (latNum === undefined || lngNum === undefined) return null;
    return { lat: latNum, lng: lngNum };
  }, [lat, lng]);

  useEffect(() => {
    if (!apiKey || !mapRef.current || !coords) {
      return;
    }

    if (!optionsInitialized) {
      setOptions({ apiKey, version: "weekly" } as unknown as object);
      optionsInitialized = true;
    }

    let marker: google.maps.Marker | null = null;

    importLibrary("maps").then(({ Map }) => {
      const map = new Map(mapRef.current as HTMLElement, {
        center: coords,
        zoom: 13,
        mapId: mapId || undefined,
      });

      marker = new google.maps.Marker({
        position: coords,
        map,
      });
    });

    return () => {
      if (marker) {
        marker.setMap(null);
      }
    };
  }, [apiKey, coords, mapId]);

  if (!apiKey || !coords) {
    return (
      <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-border bg-card text-sm text-muted-foreground">
        Google Maps placeholder (add key + live coordinates)
      </div>
    );
  }

  return <div ref={mapRef} className="h-72 w-full rounded-2xl" />;
}
