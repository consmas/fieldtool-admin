import { NextRequest, NextResponse } from "next/server";

type Suggestion = {
  placeId: string;
  description: string;
  lat?: number;
  lng?: number;
  mapUrl?: string;
  source: "places_textsearch" | "geocode";
};

function toMapUrl(lat?: number, lng?: number) {
  if (typeof lat !== "number" || typeof lng !== "number") return undefined;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ suggestions: [] as Suggestion[] });
  }

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json({ suggestions: [] as Suggestion[] });
  }

  try {
    const [textSearchRes, geocodeRes] = await Promise.all([
      fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
          q
        )}&region=gh&key=${key}`
      ),
      fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          q
        )}&components=country:GH&key=${key}`
      ),
    ]);

    const textSearch = (await textSearchRes.json()) as {
      results?: Array<{
        place_id?: string;
        name?: string;
        formatted_address?: string;
        geometry?: { location?: { lat?: number; lng?: number } };
      }>;
    };
    const geocode = (await geocodeRes.json()) as {
      results?: Array<{
        place_id?: string;
        formatted_address?: string;
        geometry?: { location?: { lat?: number; lng?: number } };
      }>;
    };

    const merged = new Map<string, Suggestion>();

    (textSearch.results ?? []).slice(0, 6).forEach((item, idx) => {
      const placeId = item.place_id ?? `place-text-${idx}`;
      const lat = item.geometry?.location?.lat;
      const lng = item.geometry?.location?.lng;
      merged.set(placeId, {
        placeId,
        description: item.formatted_address
          ? `${item.name ?? item.formatted_address} — ${item.formatted_address}`
          : item.name ?? "Unknown place",
        lat,
        lng,
        mapUrl: toMapUrl(lat, lng),
        source: "places_textsearch",
      });
    });

    (geocode.results ?? []).slice(0, 6).forEach((item, idx) => {
      const placeId = item.place_id ?? `place-geo-${idx}`;
      if (merged.has(placeId)) return;
      const lat = item.geometry?.location?.lat;
      const lng = item.geometry?.location?.lng;
      merged.set(placeId, {
        placeId,
        description: item.formatted_address ?? "Unknown address",
        lat,
        lng,
        mapUrl: toMapUrl(lat, lng),
        source: "geocode",
      });
    });

    return NextResponse.json({
      suggestions: Array.from(merged.values()).slice(0, 8),
    });
  } catch {
    return NextResponse.json({ suggestions: [] as Suggestion[] }, { status: 200 });
  }
}

