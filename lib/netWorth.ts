import type { Budget } from "@/data/budgets";
import type { Operation } from "@/data/operations";
import type { NetWorthSnapshot } from "@/data/netWorthSnapshots";

export type NetWorthChartPoint = {
    key: string;
    label: string;
    tooltipLabel: string;
    value: number;
    timestamp: number;
    granularity: "month" | "day";
};

export function calculateNetWorth(budgets: Budget[], operations: Operation[]) {
    return budgets
        .filter((budget) => budget.type === "account")
        .reduce((total, account) => {
            const operationImpact = operations.reduce(
                (impactTotal, operation) =>
                    impactTotal + (operation.accountImpact[account.id] ?? 0),
                0,
            );

            return total + account.amount + operationImpact;
        }, 0);
}

/**
 * Calcule le patrimoine à la fin d'une journée donnée.
 *
 * Les montants définis dans les comptes servent de base,
 * puis seules les opérations antérieures à la date sont ajoutées.
 */
export function calculateNetWorthAtDate(
    budgets: Budget[],
    operations: Operation[],
    date: Date,
) {
    const endOfDay = new Date(date);

    endOfDay.setHours(23, 59, 59, 999);

    const operationsUntilDate = operations.filter((operation) => {
        const operationDate = new Date(operation.createdAt);

        return (
            !Number.isNaN(operationDate.getTime()) &&
            operationDate.getTime() <= endOfDay.getTime()
        );
    });

    return calculateNetWorth(budgets, operationsUntilDate);
}

export function getCurrentMonthKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0",
    )}`;
}

export function getMonthLabel(date = new Date()) {
    return date.toLocaleDateString("fr-FR", {
        month: "short",
        year: "numeric",
    });
}

function getDateKey(date: Date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");
}

function parseMonthKey(month: string) {
    const [year, monthNumber] = month.split("-").map(Number);

    if (!Number.isFinite(year) || !Number.isFinite(monthNumber)) {
        return null;
    }

    return new Date(year, monthNumber - 1, 1);
}

export function buildNetWorthChartData({
    budgets,
    operations,
    snapshots,
    now = new Date(),
    dailyHistoryDays = 30,
}: {
    budgets: Budget[];
    operations: Operation[];
    snapshots: NetWorthSnapshot[];
    now?: Date;
    dailyHistoryDays?: number;
}): NetWorthChartPoint[] {
    const today = new Date(now);

    today.setHours(0, 0, 0, 0);

    const dailyStartDate = new Date(today);

    dailyStartDate.setDate(dailyStartDate.getDate() - (dailyHistoryDays - 1));

    /*
     * On garde uniquement les snapshots mensuels
     * réellement antérieurs à la période journalière.
     */
    const monthlyPoints: NetWorthChartPoint[] = snapshots
        .map((snapshot): NetWorthChartPoint | null => {
            const snapshotDate = parseMonthKey(snapshot.month);

            if (!snapshotDate) {
                return null;
            }

            return {
                key: `month-${snapshot.month}`,
                label: snapshot.label,
                tooltipLabel: snapshotDate.toLocaleDateString("fr-FR", {
                    month: "long",
                    year: "numeric",
                }),
                value: snapshot.value,
                timestamp: snapshotDate.getTime(),
                granularity: "month",
            };
        })
        .filter(
            (point): point is NetWorthChartPoint =>
                point !== null && point.timestamp < dailyStartDate.getTime(),
        );

    /*
     * On reconstruit ensuite chaque journée
     * des 30 derniers jours.
     */
    const dailyPoints: NetWorthChartPoint[] = [];

    const cursor = new Date(dailyStartDate);

    while (cursor.getTime() <= today.getTime()) {
        const pointDate = new Date(cursor);

        dailyPoints.push({
            key: `day-${getDateKey(pointDate)}`,
            label: pointDate.toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "2-digit",
            }),
            tooltipLabel: pointDate.toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
            }),
            value: calculateNetWorthAtDate(budgets, operations, pointDate),
            timestamp: pointDate.getTime(),
            granularity: "day",
        });

        cursor.setDate(cursor.getDate() + 1);
    }

    return [...monthlyPoints, ...dailyPoints].sort(
        (firstPoint, secondPoint) =>
            firstPoint.timestamp - secondPoint.timestamp,
    );
}
