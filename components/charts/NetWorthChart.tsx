"use client";

import { useMemo } from "react";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    ResponsiveContainer,
    Tooltip,
    CartesianGrid,
} from "recharts";

import type { Budget } from "@/data/budgets";
import type { Operation } from "@/data/operations";
import type { NetWorthSnapshot } from "@/data/netWorthSnapshots";

import { buildNetWorthChartData, calculateNetWorth } from "@/lib/netWorth";

type NetWorthChartProps = {
    budgets: Budget[];
    operations: Operation[];
    snapshots: NetWorthSnapshot[];
    budgetResetDay: number;
};

type TooltipPayload = {
    value: number;
    payload: {
        tooltipLabel: string;
    };
};

type CustomTooltipProps = {
    active?: boolean;
    payload?: TooltipPayload[];
};

function CustomTooltip({ active, payload }: CustomTooltipProps) {
    const point = payload?.[0];

    if (!active || !point) {
        return null;
    }

    return (
        <div className="rounded-xl border border-white/10 bg-[#0b1623] px-3 py-2 shadow-xl">
            <p className="text-xs capitalize text-slate-400">
                {point.payload.tooltipLabel}
            </p>

            <p className="mt-1 font-semibold text-purple-400">
                {point.value.toLocaleString("fr-FR")} €
            </p>
        </div>
    );
}

export default function NetWorthChart({
    budgets,
    operations,
    snapshots,
    budgetResetDay,
}: NetWorthChartProps) {
    const currentNetWorth = useMemo(
        () =>
            calculateNetWorth(
                budgets,
                operations,
                budgetResetDay,
            ),
        [budgets, operations, budgetResetDay],
    );

    const data = useMemo(
        () =>
            buildNetWorthChartData({
                budgets,
                operations,
                snapshots,
                budgetResetDay,
                dailyHistoryDays: 30,
            }),
        [
            budgets,
            operations,
            snapshots,
            budgetResetDay,
        ],
    );

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="mb-3 shrink-0">
                <p className="text-4xl font-bold text-purple-400">
                    {currentNetWorth.toLocaleString("fr-FR")} €
                </p>

                <p className="text-sm text-slate-400">Total de mes comptes</p>
            </div>

            <div className="min-h-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={data}
                        margin={{
                            top: 10,
                            right: 8,
                            bottom: 0,
                            left: 0,
                        }}
                    >
                        <CartesianGrid
                            stroke="rgba(148, 163, 184, 0.10)"
                            vertical={false}
                        />

                        <XAxis
                            dataKey="label"
                            stroke="#94a3b8"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                            minTickGap={28}
                        />

                        <YAxis
                            stroke="#94a3b8"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            width={55}
                            tickFormatter={(value: number) => {
                                const thousands = value / 1000;

                                return `${thousands.toLocaleString("fr-FR", {
                                    maximumFractionDigits: 1,
                                })}k`;
                            }}
                        />

                        <Tooltip
                            content={<CustomTooltip />}
                            cursor={{
                                stroke: "rgba(168, 85, 247, 0.35)",
                            }}
                        />

                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#a855f7"
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 5 }}
                            isAnimationActive={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
