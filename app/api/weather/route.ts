import { NextRequest, NextResponse } from "next/server";
import { getWeather } from "@/lib/weather";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const latitude = Number(searchParams.get("latitude"));
  const longitude = Number(searchParams.get("longitude"));

  const weather = await getWeather(
    Number.isNaN(latitude) ? undefined : latitude,
    Number.isNaN(longitude) ? undefined : longitude
  );

  return NextResponse.json(weather);
}