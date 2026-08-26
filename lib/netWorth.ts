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

/*
 * Retourne la date de début du cycle budgétaire
 * contenant la date donnée.
 */
function getBudgetCycleStart(date: Date, budgetResetDay: number) {
    const referenceDate = new Date(date);

    const safeResetDay = Math.min(
        Math.max(Math.trunc(budgetResetDay), 1),
        31,
    );

    function createResetDate(year: number, month: number) {
        const lastDayOfMonth = new Date(
            year,
            month + 1,
            0,
        ).getDate();

        const resetDate = new Date(
            year,
            month,
            Math.min(safeResetDay, lastDayOfMonth),
        );

        resetDate.setHours(0, 0, 0, 0);

        return resetDate;
    }

    const currentMonthReset = createResetDate(
        referenceDate.getFullYear(),
        referenceDate.getMonth(),
    );

    if (referenceDate.getTime() >= currentMonthReset.getTime()) {
        return currentMonthReset;
    }

    return createResetDate(
        referenceDate.getFullYear(),
        referenceDate.getMonth() - 1,
    );
}

/*
 * Retourne uniquement les opérations appartenant
 * au cycle budgétaire contenant referenceDate.
 *
 * Pour une date historique, seules les opérations
 * déjà réalisées à cette date sont conservées.
 */
function getOperationsForBudgetCycle(
    operations: Operation[],
    budgetResetDay: number,
    referenceDate: Date,
) {
    const cycleStart = getBudgetCycleStart(
        referenceDate,
        budgetResetDay,
    );

    const endOfDay = new Date(referenceDate);

    endOfDay.setHours(23, 59, 59, 999);

    return operations.filter((operation) => {
        const operationDate = new Date(operation.createdAt);

        if (Number.isNaN(operationDate.getTime())) {
            return false;
        }

        return (
            operationDate.getTime() >= cycleStart.getTime() &&
            operationDate.getTime() <= endOfDay.getTime()
        );
    });
}

export function calculateNetWorth(
    budgets: Budget[],
    operations: Operation[],
    budgetResetDay: number,
    referenceDate = new Date(),
) {
    const cycleOperations = getOperationsForBudgetCycle(
        operations,
        budgetResetDay,
        referenceDate,
    );

    return budgets
        .filter((budget) => budget.type === "account")
        .reduce((total, account) => {
            const operationImpact = cycleOperations.reduce(
                (impactTotal, operation) =>
                    impactTotal +
                    (operation.accountImpact[account.id] ?? 0),
                0,
            );

            /*
             * Même comportement que BudgetList :
             * un compte ne peut pas afficher moins de 0 €.
             */
            const currentAmount = Math.max(
                account.amount + operationImpact,
                0,
            );

            return total + currentAmount;
        }, 0);
}

/**
 * Calcule le patrimoine à la fin d'une journée donnée.
 */
export function calculateNetWorthAtDate(
    budgets: Budget[],
    operations: Operation[],
    date: Date,
    budgetResetDay: number,
) {
    return calculateNetWorth(
        budgets,
        operations,
        budgetResetDay,
        date,
    );
}

export function getCurrentMonthKey(date = new Date()) {
    return `${date.getFullYear()}-${String(
        date.getMonth() + 1,
    ).padStart(2, "0")}`;
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

    if (
        !Number.isFinite(year) ||
        !Number.isFinite(monthNumber)
    ) {
        return null;
    }

    return new Date(year, monthNumber - 1, 1);
}

export function buildNetWorthChartData({
    budgets,
    operations,
    snapshots,
    budgetResetDay,
    now = new Date(),
    dailyHistoryDays = 30,
}: {
    budgets: Budget[];
    operations: Operation[];
    snapshots: NetWorthSnapshot[];
    budgetResetDay: number;
    now?: Date;
    dailyHistoryDays?: number;
}): NetWorthChartPoint[] {
    const today = new Date(now);

    today.setHours(0, 0, 0, 0);

    const requestedDailyStartDate = new Date(today);

    requestedDailyStartDate.setDate(
        requestedDailyStartDate.getDate() -
            (dailyHistoryDays - 1),
    );

    /*
     * Avec le système actuel, budget.amount représente
     * la base du cycle courant.
     *
     * On ne reconstruit donc pas artificiellement les jours
     * appartenant à un ancien cycle avec la base actuelle.
     */
    const currentCycleStart = getBudgetCycleStart(
        today,
        budgetResetDay,
    );

    const dailyStartDate = new Date(
        Math.max(
            requestedDailyStartDate.getTime(),
            currentCycleStart.getTime(),
        ),
    );

    /*
     * Les anciens snapshots mensuels sont conservés.
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
                tooltipLabel:
                    snapshotDate.toLocaleDateString("fr-FR", {
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
                point !== null &&
                point.timestamp < dailyStartDate.getTime(),
        );

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
            tooltipLabel:
                pointDate.toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                }),
            value: calculateNetWorthAtDate(
                budgets,
                operations,
                pointDate,
                budgetResetDay,
            ),
            timestamp: pointDate.getTime(),
            granularity: "day",
        });

        cursor.setDate(cursor.getDate() + 1);
    }

    return [...monthlyPoints, ...dailyPoints].sort(
        (firstPoint, secondPoint) =>
            firstPoint.timestamp -
            secondPoint.timestamp,
    );
}