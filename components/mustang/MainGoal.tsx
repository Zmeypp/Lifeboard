import type { Budget } from "@/data/budgets";
import type { Goal } from "@/data/goals";
import type { Operation } from "@/data/operations";
import type { AppSettings } from "@/data/settings";
import { motion } from "framer-motion";

type MainGoalProps = {
  budgets: Budget[];
  goals: Goal[];
  operations: Operation[];
  settings: AppSettings;
};

const bars: Record<Goal["color"], string> = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-500",
};

const textColors: Record<Goal["color"], string> = {
  blue: "text-blue-400",
  green: "text-green-400",
  purple: "text-purple-400",
  orange: "text-orange-400",
  yellow: "text-yellow-400",
};

export default function MainGoal({ budgets, goals, operations, settings, }: MainGoalProps) {
  const mainGoal = goals.find((goal) => goal.isMain && !goal.isCompleted);

  if (!mainGoal) {
    return <p className="text-slate-400">Aucun objectif principal.</p>;
  }

  const safetyLivretA = settings.livretASafetyAmount;

  const baseLivretA =
    budgets.find((budget) => budget.name === "Livret A")?.amount ?? 0;

  const livretImpact = operations.reduce((total, operation) => {
    return total + (operation.accountImpact["Livret A"] ?? 0);
  }, 0);

  const currentLivretA = baseLivretA + livretImpact;

  const current = Math.max(currentLivretA - safetyLivretA, 0);
  const target = mainGoal.target;
  const percent = Math.min(Math.round((current / target) * 100), 100);
  const remaining = Math.max(target - current, 0);

  return (
  <div className="flex h-full flex-col">
    <div className="mb-2 flex items-center gap-2">
      <span className="text-2xl">{mainGoal.icon}</span>

      <div>
        <p className="text-xs text-slate-400">
          Objectif principal
        </p>

        <p className="text-xs text-slate-500">
          {mainGoal.name}
        </p>
      </div>
    </div>

    <p className={`text-2xl font-bold ${textColors[mainGoal.color]}`}>
      {current.toLocaleString("fr-FR")} €
    </p>

    <p className="text-xs text-slate-400">
      sur {target.toLocaleString("fr-FR")} €
    </p>

    <div className="mt-3">
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-slate-400">
          Progression
        </span>

        <span className={textColors[mainGoal.color]}>
          {percent}%
        </span>
      </div>

      <div className="h-2 rounded-full bg-white/10">
        <motion.div
          className={`h-full rounded-full ${bars[mainGoal.color]}`}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{
            duration: 0.8,
            ease: "easeOut",
          }}
        />
      </div>

      <p className="mt-2 text-xs text-slate-400">
        Encore{" "}
        <span className="font-bold text-white">
          {remaining.toLocaleString("fr-FR")} €
        </span>
      </p>
    </div>
  </div>
);
}