"use client";

import { useEffect, useState } from "react";
import { getWeatherIcon } from "@/components/weather/weatherIcons";
import type { WeatherData } from "@/lib/weather";

type TopBarProps = {
    firstName: string;
    city: string;
    latitude: number;
    longitude: number;
    isPresentation?: boolean;
};

const TEN_MINUTES = 10 * 60 * 1000;

export default function TopBar({
    firstName,
    city,
    latitude,
    longitude,
    isPresentation = false,
}: TopBarProps) {
    const [now, setNow] = useState(new Date());
    const [weather, setWeather] = useState<WeatherData | null>(null);

    useEffect(() => {
        const clockInterval = setInterval(() => {
            setNow(new Date());
        }, 1000);

        return () => clearInterval(clockInterval);
    }, []);

    useEffect(() => {
        let isCancelled = false;
        let retryTimeout: ReturnType<typeof setTimeout> | null = null;
        let refreshInterval: ReturnType<typeof setInterval> | null = null;
        let currentController: AbortController | null = null;
        let isLoading = false;

        async function loadWeather() {
            if (isCancelled || isLoading) {
                return;
            }

            isLoading = true;

            currentController?.abort();
            currentController = new AbortController();

            const requestTimeout = setTimeout(() => {
                currentController?.abort();
            }, 10_000);

            try {
                const params = new URLSearchParams({
                    latitude: latitude.toString(),
                    longitude: longitude.toString(),
                    timestamp: Date.now().toString(),
                });

                const response = await fetch(
                    `/api/weather?${params.toString()}`,
                    {
                        cache: "no-store",
                        signal: currentController.signal,
                    },
                );

                if (!response.ok) {
                    throw new Error(
                        `Erreur météo : ${response.status} ${response.statusText}`,
                    );
                }

                const data: WeatherData = await response.json();

                if (isCancelled) {
                    return;
                }

                setWeather(data);

                // La météo a bien été obtenue :
                // on arrête les tentatives rapides.
                if (retryTimeout) {
                    clearTimeout(retryTimeout);
                    retryTimeout = null;
                }

                // Puis on actualise normalement toutes les 10 minutes.
                if (!refreshInterval) {
                    refreshInterval = setInterval(() => {
                        void loadWeather();
                    }, TEN_MINUTES);
                }
            } catch (error) {
                if (isCancelled) {
                    return;
                }

                if (error instanceof Error && error.name === "AbortError") {
                    console.warn(
                        "Chargement météo interrompu ou trop long, nouvelle tentative...",
                    );
                } else {
                    console.error(
                        "Impossible de charger la météo dans la TopBar :",
                        error,
                    );
                }

                // En cas d'échec au démarrage, on retente rapidement
                // au lieu d'attendre 10 minutes.
                if (!retryTimeout) {
                    retryTimeout = setTimeout(() => {
                        retryTimeout = null;
                        void loadWeather();
                    }, 10_000);
                }
            } finally {
                clearTimeout(requestTimeout);
                isLoading = false;
            }
        }

        function handleOnline() {
            void loadWeather();
        }

        function handleVisibilityChange() {
            if (document.visibilityState === "visible") {
                void loadWeather();
            }
        }

        void loadWeather();

        window.addEventListener("online", handleOnline);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            isCancelled = true;

            currentController?.abort();

            if (retryTimeout) {
                clearTimeout(retryTimeout);
            }

            if (refreshInterval) {
                clearInterval(refreshInterval);
            }

            window.removeEventListener("online", handleOnline);
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange,
            );
        };
    }, [latitude, longitude]);

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
                    <p className="text-slate-400">Bienvenue sur LifeBoard</p>
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
                        {weather
                            ? `${Math.round(weather.temperature)}°C`
                            : "--°C"}
                    </div>

                    <div className="text-sm text-slate-400">
                        {city || "Localisation"}
                    </div>
                </div>
            </div>
        </header>
    );
}
