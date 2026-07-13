import type { Budget } from "@/data/budgets";
import type { Operation } from "@/data/operations";
import { isInCurrentBudgetCycle } from "@/lib/budgetCycle";
import type { AppSettings } from "@/data/settings";
import { motion } from "framer-motion";

type BudgetListProps = {
  budgets: Budget[];
  operations: Operation[];
  settings: AppSettings;
};

const colors: Record<string, string> = {
  blue: "text-blue-400 bg-blue-500/10",
  green: "text-green-400 bg-green-500/10",
  purple: "text-purple-400 bg-purple-500/10",
  orange: "text-orange-400 bg-orange-500/10",
  yellow: "text-yellow-400 bg-yellow-500/10",
};

const bars: Record<string, string> = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-500",
};

export default function BudgetList({ budgets, operations, settings, }: BudgetListProps) {

  const currentCycleOperations = operations.filter((operation) =>
    isInCurrentBudgetCycle(
        operation.createdAt,
        settings.budgetResetDay
    )
  );
  return (
    <div className="space-y-4">
      {budgets.map((budget) => {
  const budgetImpact =
    currentCycleOperations.reduce(
      (total, operation) =>
        total +
        (operation.budgetImpact[budget.id] ?? 0),
      0,
    );

  const accountImpact =
    currentCycleOperations.reduce(
      (total, operation) =>
        total +
        (operation.accountImpact[budget.id] ?? 0),
      0,
    );

  /*
   * Un compte lit accountImpact.
   * Un budget de dépense lit budgetImpact.
   *
   * On ne mélange plus les deux sur le même budget.
   */
  const operationImpact =
    budget.type === "account"
      ? accountImpact
      : budgetImpact;

  const remaining = Math.max(
    budget.amount + operationImpact,
    0,
  );

  const max =
    budget.id === "livret-a"
      ? settings.livretASafetyAmount
      : budget.max;

  const percent =
    max > 0
      ? Math.min(
          Math.round((remaining / max) * 100),
          100,
        )
      : 0;

  return (
  <div
    key={budget.id}
    className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
  >
    <div className="flex items-center gap-4">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${
          colors[budget.color]
        }`}
      >
        {budget.icon}
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p
            className={`text-sm font-semibold ${
              colors[budget.color].split(" ")[0]
            }`}
          >
            {budget.name}
          </p>

          <p className="text-sm text-slate-400">
            {percent}%
          </p>
        </div>

        <p
          className={`mt-1 text-2xl font-bold ${
            colors[budget.color].split(" ")[0]
          }`}
        >
          {remaining.toLocaleString("fr-FR")} €
        </p>

        <div className="mt-3 h-1.5 rounded-full bg-white/10">
          <motion.div
            className={`h-full rounded-full ${bars[budget.color]}`}
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{
              duration: 0.8,
              ease: "easeOut",
            }}
          />
        </div>
      </div>
    </div>
  </div>
);
})}
    </div>
  );
}