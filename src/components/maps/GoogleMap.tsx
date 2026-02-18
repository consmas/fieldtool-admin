"use client";

import { useEffect, useMemo, useRef } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

interface GoogleMapProps {
  lat?: number | string;
  lng?: number | string;
}

let optionsInitialized = false;

declare global {
  interface Window {
    __gmapsOptionsSet?: boolean;
  }
}

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

    if (!optionsInitialized && !window.__gmapsOptionsSet) {
      setOptions({ key: apiKey, v: "weekly" });
      optionsInitialized = true;
      window.__gmapsOptionsSet = true;
    }

    let marker: google.maps.marker.AdvancedMarkerElement | null = null;
    let circle: google.maps.Circle | null = null;

    importLibrary("maps").then(async ({ Map }) => {
      const map = new Map(mapRef.current as HTMLElement, {
        center: coords,
        zoom: 13,
        mapId: mapId || undefined,
      });

      // Advanced markers require a valid mapId. Fall back to a circle pin.
      if (mapId) {
        const markerLibrary = await importLibrary("marker");
        marker = new markerLibrary.AdvancedMarkerElement({
          position: coords,
          map,
        });
      } else {
        circle = new google.maps.Circle({
          map,
          center: coords,
          radius: 25,
          strokeWeight: 2,
          strokeColor: "#0ea5e9",
          fillColor: "#38bdf8",
          fillOpacity: 0.7,
        });
      }
    });

    return () => {
      if (marker) {
        marker.map = null;
      }
      if (circle) {
        circle.setMap(null);
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
