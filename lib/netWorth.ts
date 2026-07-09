import type { Budget } from "@/data/budgets";
import type { Operation } from "@/data/operations";

export function calculateNetWorth(budgets: Budget[], operations: Operation[]) {
  const baseCompteCourant =
    budgets.find((budget) => budget.name === "Compte courant")?.amount ?? 0;

  const baseLivretA =
    budgets.find((budget) => budget.name === "Livret A")?.amount ?? 0;

  const accountImpact = operations.reduce((total, operation) => {
    const compteImpact = operation.accountImpact["Compte courant"] ?? 0;
    const livretImpact = operation.accountImpact["Livret A"] ?? 0;

    return total + compteImpact + livretImpact;
  }, 0);

  return baseCompteCourant + baseLivretA + accountImpact;
}

export function getCurrentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getMonthLabel(date = new Date()) {
  return date.toLocaleDateString("fr-FR", {
    month: "short",
    year: "numeric",
  });
}