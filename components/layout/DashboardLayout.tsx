"use client";

import { useEffect, useState } from "react";

import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import DashboardGrid from "@/components/dashboard/DashboardGrid";
import OperationsPage from "@/components/operations/OperationsPage";
import BudgetPage from "@/components/budgets/BudgetPage";
import ObjectivesPage from "@/components/objectives/ObjectivesPage";
import StatisticsPage from "@/components/statistics/StatisticsPage";
import SettingsPage from "@/components/settings/SettingsPage";
import { AnimatePresence, motion } from "framer-motion";
import usePresentationMode from "@/hooks/usePresentationMode";

import { initialBudgets } from "@/data/budgets";
import type { Budget } from "@/data/budgets";
import { initialGoals } from "@/data/goals";
import type { Goal } from "@/data/goals";
import { initialSettings } from "@/data/settings";
import type { AppSettings } from "@/data/settings";
import { initialOperations } from "@/data/operations";
import type { Operation } from "@/data/operations";
import { initialNetWorthSnapshots } from "@/data/netWorthSnapshots";
import type { NetWorthSnapshot } from "@/data/netWorthSnapshots";
import type { MealPlan } from "@/types/mealPlan";
import TodayMealPage from "@/components/meals/TodayMealPage";
import WeekMealsPage from "@/components/meals/WeekMealsPage";

export type Page =
    | "overview"
    | "budget"
    | "operations"
    | "objectives"
    | "statistics"
    | "today-meal"
    | "week-meals"
    | "settings";

type GenerationStatus = {
    isGenerating: boolean;
    mealPlan: number;
    mealPlanMax: number;
    images: number;
    imagesMax: number;
    status: "idle" | "running" | "waiting" | "success" | "error";
    error: string | null;
    waitReason: string | null;
    retryAt: string | null;
};

export default function DashboardLayout() {
    const [activePage, setActivePage] = useState<Page>("overview");

    const [isLoaded, setIsLoaded] = useState(false);
    const [operations, setOperations] = useState<Operation[]>([]);
    const [netWorthSnapshots, setNetWorthSnapshots] = useState<
        NetWorthSnapshot[]
    >([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [settings, setSettings] = useState<AppSettings>(initialSettings);
    const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
    const [generationStatus, setGenerationStatus] =
        useState<GenerationStatus | null>(null);

    const presentationDisabled =
        activePage == "today-meal" ||
        activePage == "week-meals" ||
        activePage === "settings";

    const { inactiveSeconds, isPresentation, shouldReturnHome } =
        usePresentationMode();

    useEffect(() => {
        async function loadStatus() {
            const response = await fetch("/api/meals/status", {
                cache: "no-store",
            });

            const data = await response.json();
            setGenerationStatus(data);

            if (
                !data.isGenerating &&
                data.mealPlan === 1 &&
                data.images === 7
            ) {
                const mealResponse = await fetch(
                    `/data/lifeboard_meal_plan.json?t=${Date.now()}`,
                    { cache: "no-store" },
                );

                if (mealResponse.ok) {
                    const newMealPlan = await mealResponse.json();
                    setMealPlan(newMealPlan);
                }
            }
        }

        loadStatus();

        const interval = setInterval(loadStatus, 1000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        async function loadMealPlan() {
            const response = await fetch("/data/lifeboard_meal_plan.json", {
                cache: "no-store",
            });

            if (!response.ok) return;

            const data = await response.json();
            setMealPlan(data);
        }

        loadMealPlan();
    }, []);

    useEffect(() => {
        if (presentationDisabled) return;
        if (isPresentation) return;

        if (shouldReturnHome && activePage !== "overview") {
            setActivePage("overview");
        }
    }, [shouldReturnHome, activePage, presentationDisabled, isPresentation]);

    useEffect(() => {
        if (presentationDisabled || !isPresentation) return;

        setActivePage("statistics");

        const slideshow = window.setInterval(() => {
            setActivePage((current) =>
                current === "overview" ? "statistics" : "overview",
            );
        }, 15000);

        return () => window.clearInterval(slideshow);
    }, [isPresentation, presentationDisabled]);

    useEffect(() => {
        const savedOperations = localStorage.getItem("lifeboard_operations");
        const savedSnapshots = localStorage.getItem(
            "lifeboard_net_worth_snapshots",
        );
        const savedBudgets = localStorage.getItem("lifeboard_budgets");
        const savedGoals = localStorage.getItem("lifeboard_goals");
        const savedSettings = localStorage.getItem("lifeboard_settings");

        const parsedOperations: Operation[] = savedOperations
            ? JSON.parse(savedOperations)
            : initialOperations;

        const parsedSnapshots: NetWorthSnapshot[] = savedSnapshots
            ? JSON.parse(savedSnapshots)
            : initialNetWorthSnapshots;

        const parsedBudgets: Budget[] = savedBudgets
            ? JSON.parse(savedBudgets)
            : initialBudgets;

        const parsedGoals: Goal[] = savedGoals
            ? JSON.parse(savedGoals)
            : initialGoals;

        const parsedSettings: AppSettings = savedSettings
            ? JSON.parse(savedSettings)
            : initialSettings;

        setOperations(parsedOperations);
        setNetWorthSnapshots(parsedSnapshots);
        setBudgets(parsedBudgets);
        setGoals(parsedGoals);
        setSettings(parsedSettings);

        setIsLoaded(true);
    }, []);

    useEffect(() => {
        if (!isLoaded) return;
        localStorage.setItem(
            "lifeboard_operations",
            JSON.stringify(operations),
        );
    }, [operations, isLoaded]);

    useEffect(() => {
        if (!isLoaded) return;
        localStorage.setItem(
            "lifeboard_net_worth_snapshots",
            JSON.stringify(netWorthSnapshots),
        );
    }, [netWorthSnapshots, isLoaded]);

    useEffect(() => {
        if (!isLoaded) return;
        localStorage.setItem("lifeboard_budgets", JSON.stringify(budgets));
    }, [budgets, isLoaded]);

    useEffect(() => {
        if (!isLoaded) return;
        localStorage.setItem("lifeboard_goals", JSON.stringify(goals));
    }, [goals, isLoaded]);

    useEffect(() => {
        if (!isLoaded) return;
        localStorage.setItem("lifeboard_settings", JSON.stringify(settings));
    }, [settings, isLoaded]);

    function handleAddOperation(operation: Operation) {
        setOperations((current) => [operation, ...current]);
    }

    function handleDeleteOperation(id: number) {
        setOperations((current) =>
            current.filter((operation) => operation.id !== id),
        );
    }

    function handleUpdateOperation(updatedOperation: Operation) {
        setOperations((current) =>
            current.map((operation) =>
                operation.id === updatedOperation.id
                    ? updatedOperation
                    : operation,
            ),
        );
    }

    function handleImportData(data: {
        settings?: AppSettings;
        budgets?: Budget[];
        operations?: Operation[];
        goals?: Goal[];
        netWorthSnapshots?: NetWorthSnapshot[];
    }) {
        if (data.settings) setSettings(data.settings);
        if (data.budgets) setBudgets(data.budgets);
        if (data.operations) setOperations(data.operations);
        if (data.goals) setGoals(data.goals);
        if (data.netWorthSnapshots)
            setNetWorthSnapshots(data.netWorthSnapshots);
    }

    const baseLivretA =
        budgets.find((budget) => budget.name === "Livret A")?.amount ?? 0;

    const livretImpact = operations.reduce((total, operation) => {
        return total + (operation.accountImpact["livret-a"] ?? 0);
    }, 0);

    const currentLivretA = baseLivretA + livretImpact;

    const mainGoalCurrent = Math.max(
        currentLivretA - settings.livretASafetyAmount,
        0,
    );

    return (
        <main className="h-screen overflow-hidden bg-[#050b12] p-6 text-white">
            <div className="flex h-full gap-4">
                <Sidebar activePage={activePage} onChangePage={setActivePage} />

                <section className="flex min-h-0 flex-1 flex-col gap-6">
                    <TopBar
                        firstName={settings.firstName}
                        city={settings.weatherCity}
                        latitude={settings.weatherLatitude}
                        longitude={settings.weatherLongitude}
                        isPresentation={isPresentation}
                    />

                    <div className="flex min-h-0 flex-1">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activePage}
                                className="flex min-h-0 flex-1"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.18, ease: "easeOut" }}
                            >
                                {activePage === "overview" && (
                                    <DashboardGrid
                                        operations={operations}
                                        budgets={budgets}
                                        goals={goals}
                                        netWorthSnapshots={netWorthSnapshots}
                                        setNetWorthSnapshots={
                                            setNetWorthSnapshots
                                        }
                                        onAddOperation={handleAddOperation}
                                        settings={settings}
                                        isLoaded={isLoaded}
                                    />
                                )}

                                {activePage === "operations" && (
                                    <OperationsPage
                                        operations={operations}
                                        onDeleteOperation={
                                            handleDeleteOperation
                                        }
                                        onUpdateOperation={
                                            handleUpdateOperation
                                        }
                                    />
                                )}

                                {activePage === "budget" && (
                                    <BudgetPage
                                        budgets={budgets}
                                        onUpdateBudgets={setBudgets}
                                    />
                                )}

                                {activePage === "objectives" && (
                                    <ObjectivesPage
                                        goals={goals}
                                        onUpdateGoals={setGoals}
                                        mainGoalCurrent={mainGoalCurrent}
                                    />
                                )}

                                {activePage === "statistics" && (
                                    <StatisticsPage
                                        operations={operations}
                                        budgets={budgets}
                                        netWorthSnapshots={netWorthSnapshots}
                                    />
                                )}

                                {activePage === "settings" && (
                                    <SettingsPage
                                        settings={settings}
                                        onUpdateSettings={setSettings}
                                        budgets={budgets}
                                        operations={operations}
                                        goals={goals}
                                        netWorthSnapshots={netWorthSnapshots}
                                        onImportData={handleImportData}
                                    />
                                )}

                                {activePage === "today-meal" &&
                                    (mealPlan ? (
                                        <TodayMealPage
                                            mealPlan={mealPlan}
                                            generationStatus={generationStatus}
                                        />
                                    ) : (
                                        <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-white/10 bg-[#0b1623] p-8">
                                            <div className="text-center">
                                                <div className="mb-4 text-6xl">
                                                    🍽️
                                                </div>

                                                <h2 className="text-3xl font-bold">
                                                    Aucun repas disponible
                                                </h2>

                                                <p className="mt-4 text-slate-400">
                                                    Génère d’abord une semaine
                                                    de repas.
                                                </p>
                                            </div>
                                        </div>
                                    ))}

                                {activePage === "week-meals" && (
                                    <WeekMealsPage
                                        mealPlan={mealPlan}
                                        onUpdateMealPlan={setMealPlan}
                                        generationStatus={generationStatus}
                                    />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </section>
            </div>
        </main>
    );
}
