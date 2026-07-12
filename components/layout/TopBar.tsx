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
    let weatherInterval: ReturnType<typeof setInterval> | null = null;
    let isCancelled = false;

    async function loadWeather() {
        try {
        const response = await fetch("/api/weather", {
            cache: "no-store",
        });

        if (!response.ok) {
            throw new Error(`Erreur météo : ${response.status}`);
        }

        const data: WeatherData = await response.json();

        if (isCancelled) {
            return;
        }

        console.log("Météo TopBar chargée :", data);

        setWeather(data);

        // Une fois la première météo obtenue,
        // rafraîchissement toutes les 10 minutes.
        if (weatherInterval) {
            clearInterval(weatherInterval);
        }

        weatherInterval = setInterval(loadWeather, TEN_MINUTES);
        } catch (error) {
        console.error("Impossible de charger la météo TopBar :", error);
        }
    }

    loadWeather();

    // Tant que le premier chargement n’a pas réussi,
    // on réessaie toutes les 15 secondes.
    weatherInterval = setInterval(loadWeather, 15_000);

    return () => {
        isCancelled = true;

        if (weatherInterval) {
        clearInterval(weatherInterval);
        }
    };
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