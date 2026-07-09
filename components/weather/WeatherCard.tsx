"use client";

import { useEffect, useState } from "react";
import { getWeatherIcon } from "@/components/weather/weatherIcons";
import type { WeatherData } from "@/lib/weather";

const TEN_MINUTES = 10 * 60 * 1000;

type WeatherCardProps = {
  city: string;
  latitude: number;
  longitude: number;
};

function getWeatherLabel(code: number) {
  if (code === 0) return "Ensoleillé";
  if ([1, 2].includes(code)) return "Partiellement nuageux";
  if (code === 3) return "Couvert";
  if ([45, 48].includes(code)) return "Brouillard";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "Pluie";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Neige";
  if ([95, 96, 99].includes(code)) return "Orage";
  return "Variable";
}

export default function WeatherCard({ city, latitude, longitude }: WeatherCardProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    async function loadWeather() {
      const response = await fetch(
        `/api/weather?latitude=${latitude}&longitude=${longitude}`
      );
      const data = await response.json();
      setWeather(data);
    }

    loadWeather();

    const interval = setInterval(loadWeather, TEN_MINUTES);
    return () => clearInterval(interval);
  }, [latitude, longitude]);

  if (!weather) {
    return <p className="text-slate-400">Chargement météo...</p>;
  }

  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        <p className="text-sm text-slate-400">{city}</p>

        <div className="mt-3 flex items-center gap-4">
          <div>{getWeatherIcon(weather.weatherCode, 64)}</div>

          <div>
            <p className="text-5xl font-bold">{Math.round(weather.temperature)}°</p>
            <p className="text-slate-400">{getWeatherLabel(weather.weatherCode)}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-slate-500">Ressenti</p>
            <p className="text-lg font-semibold">{Math.round(weather.apparentTemperature)}°</p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Humidité</p>
            <p className="text-lg font-semibold">{weather.humidity}%</p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Vent</p>
            <p className="text-lg font-semibold">{Math.round(weather.windSpeed)} km/h</p>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-3 text-sm font-semibold text-slate-300">Prévisions</p>

        <div className="grid grid-cols-5 gap-1">
          {weather.hourly.map((item) => (
            <div
              key={item.time}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-center"
            >
              <p className="text-xs text-slate-400">{item.time}</p>

              <div className="my-2 flex justify-center">
                {getWeatherIcon(item.weatherCode, 24)}
              </div>

              <p className="font-bold">{Math.round(item.temperature)}°</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}