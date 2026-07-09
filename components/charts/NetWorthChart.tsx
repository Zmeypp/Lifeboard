"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import type { Budget } from "@/data/budgets";
import type { Operation } from "@/data/operations";
import type { NetWorthSnapshot } from "@/data/netWorthSnapshots";

import { calculateNetWorth } from "@/lib/netWorth";

type NetWorthChartProps = {
  budgets: Budget[];
  operations: Operation[];
  snapshots: NetWorthSnapshot[];
};

export default function NetWorthChart({
  budgets,
  operations,
  snapshots,
}: NetWorthChartProps) {
  const currentNetWorth = calculateNetWorth(budgets, operations);

  const currentMonth = new Date().toLocaleDateString("fr-FR", {
    month: "short",
    year: "numeric",
  });

  const data = [
    ...snapshots,
    {
      month: "current",
      label: currentMonth,
      value: currentNetWorth,
    },
  ];

  return (
    <div className="h-full min-h-[220px]">
      <div className="mb-4">
        <p className="text-4xl font-bold text-purple-400">
          {currentNetWorth.toLocaleString("fr-FR")} €
        </p>

        <p className="text-sm text-slate-400">
          Compte courant + Livret A
        </p>
      </div>

      <ResponsiveContainer width="100%" height="70%">
        <LineChart data={data}>
          <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} />
          <Tooltip />

          <Line
            type="monotone"
            dataKey="value"
            stroke="#a855f7"
            strokeWidth={3}
            dot
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}