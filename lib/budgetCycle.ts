export function getCurrentBudgetCycleStart(now = new Date(), resetDay = 28) {
    const year = now.getFullYear();
    const month = now.getMonth();

    if (now.getDate() >= resetDay) {
        return new Date(year, month, resetDay, 0, 0, 0, 0);
    }

    return new Date(year, month - 1, resetDay, 0, 0, 0, 0);
}

export function isInCurrentBudgetCycle(dateIso: string, resetDay = 28) {
    const operationDate = new Date(dateIso);
    const cycleStart = getCurrentBudgetCycleStart(new Date(), resetDay);

    return operationDate >= cycleStart;
}
