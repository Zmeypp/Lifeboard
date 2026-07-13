"use client";

import {
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";

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
  setNetWorthSnapshots: React.Dispatch<
    React.SetStateAction<NetWorthSnapshot[]>
  >;
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
  const budgetScrollRef = useRef<HTMLDivElement>(null);

  const budgetDragState = useRef({
    active: false,
    pointerId: -1,
    startY: 0,
    startScrollTop: 0,
    moved: false,
  });

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    const currentMonth = getCurrentMonthKey();

    const alreadyExists = netWorthSnapshots.some(
      (snapshot) => snapshot.month === currentMonth,
    );

    if (alreadyExists) {
      return;
    }

    const currentNetWorth = calculateNetWorth(
      budgets,
      operations,
    );

    setNetWorthSnapshots((current) => [
      ...current,
      {
        month: currentMonth,
        label: getMonthLabel(),
        value: currentNetWorth,
      },
    ]);
  }, [
    budgets,
    operations,
    netWorthSnapshots,
    setNetWorthSnapshots,
    isLoaded,
  ]);

  const handleBudgetPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const target = event.target as HTMLElement;

    /*
     * On ne démarre pas le déplacement lorsqu'on touche
     * un élément interactif de la liste.
     */
    if (
      target.closest(
        [
          "button",
          "a",
          "input",
          "textarea",
          "select",
          "[role='button']",
          "[data-no-drag]",
        ].join(","),
      )
    ) {
      return;
    }

    const container = budgetScrollRef.current;

    if (!container) {
      return;
    }

    budgetDragState.current = {
      active: true,
      pointerId: event.pointerId,
      startY: event.clientY,
      startScrollTop: container.scrollTop,
      moved: false,
    };

    try {
      container.setPointerCapture(event.pointerId);
    } catch {
      /*
       * Certains navigateurs ou écrans tactiles
       * ne prennent pas en charge le pointer capture.
       */
    }
  };

  const handleBudgetPointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const container = budgetScrollRef.current;
    const dragState = budgetDragState.current;

    if (
      !container ||
      !dragState.active ||
      dragState.pointerId !== event.pointerId
    ) {
      return;
    }

    const distance = event.clientY - dragState.startY;

    /*
     * Petit seuil pour éviter de considérer un simple appui
     * comme un déplacement.
     */
    if (Math.abs(distance) > 4) {
      dragState.moved = true;
    }

    if (!dragState.moved) {
      return;
    }

    container.scrollTop =
      dragState.startScrollTop - distance;

    /*
     * Empêche le navigateur de sélectionner les textes
     * ou de déplacer toute la page.
     */
    event.preventDefault();
  };

  const handleBudgetPointerEnd = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const container = budgetScrollRef.current;

    budgetDragState.current.active = false;
    budgetDragState.current.pointerId = -1;

    if (
      container &&
      container.hasPointerCapture(event.pointerId)
    ) {
      try {
        container.releasePointerCapture(
          event.pointerId,
        );
      } catch {
        // Le pointeur peut déjà avoir été libéré.
      }
    }
  };

  return (
    <div className="grid min-h-0 flex-1 grid-cols-12 grid-rows-8 gap-4">
      <Card
        delay={0}
        title="Mes budgets"
        subtitle="Montants restants"
        className="
          col-span-3 row-span-6
          min-h-0 overflow-hidden
        "
      >
        <div
          ref={budgetScrollRef}
          onPointerDown={handleBudgetPointerDown}
          onPointerMove={handleBudgetPointerMove}
          onPointerUp={handleBudgetPointerEnd}
          onPointerCancel={handleBudgetPointerEnd}
          onLostPointerCapture={handleBudgetPointerEnd}
          className="
            h-full min-h-0
            overflow-y-auto overscroll-contain
            pr-2 select-none
          "
          style={{
            WebkitOverflowScrolling: "touch",
            touchAction: "none",
            WebkitUserSelect: "none",
            userSelect: "none",
            cursor: "grab",
          }}
        >
          <BudgetList
            budgets={budgets}
            operations={operations}
            settings={settings}
          />
        </div>
      </Card>

      <Card
        delay={0.2}
        title="Ajouter une opération"
        className="col-span-3 row-span-6"
      >
        <OperationForm
  budgets={budgets}
  onAddOperation={onAddOperation}
/>
      </Card>

      <Card
        delay={0.25}
        title="Évolution patrimoine net"
        className="col-span-3 row-span-6"
      >
        <NetWorthChart
          budgets={budgets}
          operations={operations}
          snapshots={netWorthSnapshots}
        />
      </Card>

      <Card
        delay={0.05}
        title="Météo"
        className="col-span-3 row-span-6"
      >
        <WeatherCard
          city={settings.weatherCity}
          latitude={settings.weatherLatitude}
          longitude={settings.weatherLongitude}
        />
      </Card>

      <Card
        delay={0.1}
        title="Dernières opérations"
        className="col-span-6 row-span-3"
      >
        <RecentOperations
          operations={operations}
        />
      </Card>

      <Card
        delay={0.3}
        title="Objectif principal"
        className="col-span-3 row-span-3"
      >
        <MainGoal
          budgets={budgets}
          goals={goals}
          operations={operations}
          settings={settings}
        />
      </Card>

      <Card
        delay={0.15}
        title="Prochain salaire"
        className="col-span-3 row-span-3"
      >
        <SalaryCard
          salaryDay={settings.salaryDay}
        />
      </Card>
    </div>
  );
}
