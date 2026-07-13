import type { Budget } from "@/data/budgets";
import type { Operation } from "@/data/operations";

export function calculateNetWorth(
  budgets: Budget[],
  operations: Operation[],
) {
  return budgets
    .filter((budget) => budget.type === "account")
    .reduce((total, account) => {
      const operationImpact = operations.reduce(
        (impactTotal, operation) =>
          impactTotal +
          (operation.accountImpact[account.id] ?? 0),
        0,
      );

      return total + account.amount + operationImpact;
    }, 0);
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