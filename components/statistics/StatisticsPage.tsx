"use client";

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import type { Budget } from "@/data/budgets";
import type { Operation } from "@/data/operations";
import type { NetWorthSnapshot } from "@/data/netWorthSnapshots";
import { calculateNetWorth } from "@/lib/netWorth";

type StatisticsPageProps = {
  operations: Operation[];
  budgets: Budget[];
  netWorthSnapshots: NetWorthSnapshot[];
};

const chartColors = ["#a855f7", "#22c55e", "#f97316", "#eab308", "#3b82f6", "#ef4444"];

export default function StatisticsPage({
  operations,
  budgets,
  netWorthSnapshots,
}: StatisticsPageProps) {
  const expenses = operations.filter((operation) => operation.type === "expense");
  const incomes = operations.filter((operation) => operation.type === "income");

  const totalExpenses = expenses.reduce(
    (total, operation) => total + Math.abs(operation.amount),
    0
  );

  const totalIncomes = incomes.reduce(
    (total, operation) => total + operation.amount,
    0
  );

  const biggestExpense = expenses.reduce<Operation | null>((biggest, operation) => {
    if (!biggest) return operation;
    return Math.abs(operation.amount) > Math.abs(biggest.amount) ? operation : biggest;
  }, null);

  const averageExpense =
    expenses.length > 0 ? Math.round(totalExpenses / expenses.length) : 0;

  const expensesByCategory = expenses.reduce<Record<string, number>>((acc, operation) => {
    acc[operation.category] = (acc[operation.category] ?? 0) + Math.abs(operation.amount);
    return acc;
  }, {});

  const expensesCategoryData = Object.entries(expensesByCategory).map(
    ([name, value]) => ({ name, value })
  );

  const incomeByMonth = incomes.reduce<Record<string, number>>((acc, operation) => {
    const month = operation.date.split("/")[1] ?? "??";
    acc[month] = (acc[month] ?? 0) + operation.amount;
    return acc;
  }, {});

  const incomeMonthData = Object.entries(incomeByMonth).map(([month, value]) => ({
    month,
    value,
  }));

  const currentNetWorth = calculateNetWorth(budgets, operations);

  const netWorthData = [
    ...netWorthSnapshots,
    {
      month: "current",
      label: "Aujourd'hui",
      value: currentNetWorth,
    },
  ];

  const livretA = budgets.find((budget) => budget.name === "Livret A");
  const baseLivretA = livretA?.amount ?? 0;

  const livretAImpact = operations.reduce((total, operation) => {
    return total + (operation.accountImpact["Livret A"] ?? 0);
  }, 0);

  const currentLivretA = baseLivretA + livretAImpact;

  const livretAData = [
    { label: "Départ", value: baseLivretA },
    { label: "Actuel", value: currentLivretA },
  ];

  return (
    <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1623] p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold">Statistiques</h2>
        <p className="text-slate-400">
          Analyse de tes dépenses, revenus et patrimoine.
        </p>
      </div>

      <div className="grid h-full grid-cols-12 grid-rows-6 gap-4 overflow-y-auto pr-2 pb-32">
        <StatCard title="Dépenses totales" value={`${totalExpenses.toLocaleString("fr-FR")} €`} />
        <StatCard title="Revenus totaux" value={`${totalIncomes.toLocaleString("fr-FR")} €`} />
        <StatCard title="Moyenne dépense" value={`${averageExpense.toLocaleString("fr-FR")} €`} />
        <StatCard
          title="Plus grosse dépense"
          value={biggestExpense ? `${Math.abs(biggestExpense.amount).toLocaleString("fr-FR")} €` : "0 €"}
          subtitle={biggestExpense?.title ?? "Aucune dépense"}
        />

        <ChartCard
            title="Dépenses par catégorie"
            className="col-span-6 row-span-2"
        >
            <div className="flex h-[calc(100%-32px)] min-h-0">
                <div className="min-w-0 flex-1">
                <ResponsiveContainer
                    width="100%"
                    height="100%"
                    debounce={150}
                    minWidth={0}
                    minHeight={200}
                >
                    <PieChart>
                    <Pie
                        data={expensesCategoryData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        isAnimationActive={false}
                        labelLine={false}
                    >
                        {expensesCategoryData.map((entry, index) => (
                        <Cell
                            key={entry.name}
                            fill={chartColors[index % chartColors.length]}
                        />
                        ))}
                    </Pie>

                    <Tooltip
                        isAnimationActive={false}
                        animationDuration={0}
                    />
                    </PieChart>
                </ResponsiveContainer>
                </div>

                <div className="flex w-44 flex-col justify-center gap-2 pl-3">
                {expensesCategoryData.map((entry, index) => (
                    <div
                    key={entry.name}
                    className="flex items-center gap-2 text-xs text-slate-300"
                    >
                    <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                        backgroundColor:
                            chartColors[index % chartColors.length],
                        }}
                    />

                    <span className="min-w-0 flex-1 truncate">
                        {entry.name}
                    </span>

                    <span className="shrink-0 font-semibold text-white">
                        {entry.value.toLocaleString("fr-FR")} €
                    </span>
                    </div>
                ))}
                </div>
            </div>
        </ChartCard>

        <ChartCard title="Revenus par mois" className="col-span-6 row-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={incomeMonthData}>
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Bar dataKey="value" fill="#22c55e" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Patrimoine net" className="col-span-6 row-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={netWorthData}>
              <XAxis dataKey="label" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#a855f7" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Évolution du Livret A" className="col-span-6 row-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={livretAData}>
              <XAxis dataKey="label" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="col-span-3 row-span-1 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}

function ChartCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/[0.03] p-4 ${className}`}>
      <p className="mb-3 text-sm font-semibold text-slate-300">{title}</p>
      <div className="h-[calc(100%-32px)]">{children}</div>
    </div>
  );
}