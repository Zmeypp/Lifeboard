"use client";

import { useEffect } from "react";

import Card from "@/components/ui/Card";
import BudgetList from "@/components/budgets/BudgetList";
import OperationForm from "@/components/operations/OperationForm";
import RecentOperations from "@/components/operations/RecentOperations";
import NetWorthChart from "@/components/charts/NetWorthChart";
import MainGoal from "@/components/mustang/MainGoal";
import SalaryCard from "@/components/salary/SalaryCard";
import WeatherCard from "@/components/weather/WeatherCard";
import type { AppSettings } from "@/data/settings";

import type { Operation } from "@/data/operations";
import type { NetWorthSnapshot } from "@/data/netWorthSnapshots";
import type { Budget } from "@/data/budgets";
import type { Goal } from "@/data/goals";

import {
  calculateNetWorth,
  getCurrentMonthKey,
  getMonthLabel,
} from "@/lib/netWorth";

type DashboardGridProps = {
  operations: Operation[];
  budgets: Budget[];
  goals: Goal[];
  netWorthSnapshots: NetWorthSnapshot[];
  setNetWorthSnapshots: React.Dispatch<React.SetStateAction<NetWorthSnapshot[]>>;
  onAddOperation: (operation: Operation) => void;
  settings: AppSettings;
  isLoaded: boolean;
};

export default function DashboardGrid({
  operations,
  budgets,
  goals,
  netWorthSnapshots,
  setNetWorthSnapshots,
  onAddOperation,
  settings,
  isLoaded,
}: DashboardGridProps) {
  useEffect(() => {
    if (!isLoaded) return;

    const currentMonth = getCurrentMonthKey();

    const alreadyExists = netWorthSnapshots.some(
      (snapshot) => snapshot.month === currentMonth
    );

    if (alreadyExists) return;

    const currentNetWorth = calculateNetWorth(budgets, operations);

    setNetWorthSnapshots((current) => [
      ...current,
      {
        month: currentMonth,
        label: getMonthLabel(),
        value: currentNetWorth,
      },
    ]);
  }, [operations, netWorthSnapshots, setNetWorthSnapshots, isLoaded]);

  return (
    <div className="grid min-h-0 flex-1 grid-cols-12 grid-rows-8 gap-4">
      <Card delay={0} title="Mes budgets" subtitle="Montants restants" className="col-span-3 row-span-6">
        <BudgetList
          budgets={budgets}
          operations={operations}
          settings={settings}
        />
      </Card>

      <Card delay={0.20} title="Ajouter une opération" className="col-span-3 row-span-6">
        <OperationForm onAddOperation={onAddOperation} />
      </Card>

      <Card delay={0.25} title="Évolution patrimoine net" className="col-span-3 row-span-6">
        <NetWorthChart budgets={budgets} operations={operations} snapshots={netWorthSnapshots} />
      </Card>

      <Card delay={0.05} title="Météo" className="col-span-3 row-span-6">
        <WeatherCard
          city={settings.weatherCity}
          latitude={settings.weatherLatitude}
          longitude={settings.weatherLongitude}
        />
      </Card>

      <Card delay={0.10} title="Dernières opérations" className="col-span-6 row-span-3">
        <RecentOperations operations={operations} />
      </Card>

      <Card delay={0.30} title="Objectif principal" className="col-span-3 row-span-3">
        <MainGoal
          budgets={budgets}
          goals={goals}
          operations={operations}
          settings={settings}
        />
      </Card>

      <Card delay={0.15} title="Prochain salaire" className="col-span-3 row-span-3">
        <SalaryCard salaryDay={settings.salaryDay} />
      </Card>
    </div>
  );
}