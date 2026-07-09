"use client";

import { useEffect, useState } from "react";
import { getWeatherIcon } from "@/components/weather/weatherIcons";
import type { WeatherData } from "@/lib/weather";

type TopBarProps = {
  firstName: string;
  isPresentation?: boolean;
};

const TEN_MINUTES = 10 * 60 * 1000;

export default function TopBar({ firstName, isPresentation = false, }: TopBarProps) {
  const [now, setNow] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    const clockInterval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    async function loadWeather() {
      const response = await fetch("/api/weather");
      const data = await response.json();
      setWeather(data);
    }

    loadWeather();

    const weatherInterval = setInterval(loadWeather, TEN_MINUTES);

    return () => clearInterval(weatherInterval);
  }, []);

  return (
    <header className="flex h-[88px] items-center justify-between rounded-2xl border border-white/10 bg-[#0b1623] px-8">
      <div>
  <h1 className="text-3xl font-bold">
    Bonjour {firstName || "Utilisateur"} 👋
  </h1>

  {isPresentation ? (
    <div className="mt-1 flex items-center gap-2">
      <span className="h-2 w-2 animate-pulse rounded-full bg-purple-400" />

      <span className="text-sm font-medium text-purple-400">
        Mode présentation
      </span>
    </div>
  ) : (
    <p className="text-slate-400">
      Bienvenue sur LifeBoard
    </p>
  )}
</div>

      <div className="text-center">
        <div className="text-4xl font-bold">
          {now.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>

        <div className="text-sm text-slate-400">
          {now.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 text-right">
        {weather ? getWeatherIcon(weather.weatherCode, 36) : null}

        <div>
          <div className="text-2xl font-bold">
            {weather ? `${Math.round(weather.temperature)}°C` : "--°C"}
          </div>
          <div className="text-sm text-slate-400">Lille</div>
        </div>
      </div>
    </header>
  );
}