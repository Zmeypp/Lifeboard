import { NextRequest, NextResponse } from "next/server";
import { getWeather } from "@/lib/weather";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const latitudeParam = searchParams.get("latitude");
  const longitudeParam = searchParams.get("longitude");

  const latitude =
    latitudeParam !== null ? Number(latitudeParam) : undefined;

  const longitude =
    longitudeParam !== null ? Number(longitudeParam) : undefined;

  const weather = await getWeather(
    latitude !== undefined && !Number.isNaN(latitude)
      ? latitude
      : undefined,
    longitude !== undefined && !Number.isNaN(longitude)
      ? longitude
      : undefined
  );

  return NextResponse.json(weather, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}