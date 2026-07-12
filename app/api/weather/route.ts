import { NextRequest, NextResponse } from "next/server";
import { getWeather } from "@/lib/weather";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const latitudeParam = request.nextUrl.searchParams.get("latitude");
  const longitudeParam = request.nextUrl.searchParams.get("longitude");

  const latitude =
    latitudeParam && Number.isFinite(Number(latitudeParam))
      ? Number(latitudeParam)
      : undefined;

  const longitude =
    longitudeParam && Number.isFinite(Number(longitudeParam))
      ? Number(longitudeParam)
      : undefined;

  const weather = await getWeather(latitude, longitude);

  return NextResponse.json(weather, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}