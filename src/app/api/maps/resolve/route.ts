import { NextRequest, NextResponse } from "next/server";

function parseGoogleLocation(input: string): {
  address: string | null;
  lat: number | null;
  lng: number | null;
  map_url: string | null;
} {
  const value = input.trim();
  if (!value) return { address: null, lat: null, lng: null, map_url: null };

  try {
    const url = new URL(value);
    let address: string | null = null;
    let lat: number | null = null;
    let lng: number | null = null;

    const query = url.searchParams.get("q") || url.searchParams.get("query");
    if (query) {
      const decoded = decodeURIComponent(query).replace(/\+/g, " ");
      address = decoded;
      const coordMatch = decoded.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
      if (coordMatch) {
        lat = Number(coordMatch[1]);
        lng = Number(coordMatch[2]);
      }
    }

    const placeMatch = url.pathname.match(/\/place\/([^/]+)/i);
    if (placeMatch?.[1]) {
      address = decodeURIComponent(placeMatch[1]).replace(/\+/g, " ");
    }

    const atMatch = url.pathname.match(/@(-?\d+(\.\d+)?),(-?\d+(\.\d+)?)/);
    if (atMatch) {
      lat = Number(atMatch[1]);
      lng = Number(atMatch[3]);
      if (!address) {
        address = `${atMatch[1]}, ${atMatch[3]}`;
      }
    }

    const map_url =
      lat !== null && lng !== null
        ? `https://www.google.com/maps?q=${lat},${lng}`
        : value;

    return { address, lat, lng, map_url };
  } catch {
    return { address: null, lat: null, lng: null, map_url: null };
  }
}

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("url")?.trim();
  if (!source) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    const res = await fetch(source, { redirect: "follow" });
    const finalUrl = res.url || source;
    const parsed = parseGoogleLocation(finalUrl);
    if (!parsed.address && parsed.lat === null && parsed.lng === null) {
      return NextResponse.json(
        { error: "Unable to extract address from shared link." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      address: parsed.address,
      lat: parsed.lat,
      lng: parsed.lng,
      map_url: parsed.map_url,
      final_url: finalUrl,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to resolve shared link." },
      { status: 500 }
    );
  }
}
