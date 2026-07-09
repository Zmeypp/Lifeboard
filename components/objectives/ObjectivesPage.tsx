"use client";

import { useState } from "react";
import type { Goal } from "@/data/goals";
import AnimatedButton from "@/components/ui/AnimatedButton";
import { motion } from "framer-motion";

type ObjectivesPageProps = {
  goals: Goal[];
  onUpdateGoals: (goals: Goal[]) => void;
  mainGoalCurrent: number;
};

const colors: Record<Goal["color"], string> = {
  blue: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  green: "text-green-400 bg-green-500/10 border-green-500/30",
  purple: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  orange: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  yellow: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
};

const bars: Record<Goal["color"], string> = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-500",
};

export default function ObjectivesPage({ goals, onUpdateGoals, mainGoalCurrent, }: ObjectivesPageProps) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [icon, setIcon] = useState("🎯");
  const [color, setColor] = useState<Goal["color"]>("purple");

  function addGoal() {
    if (!name.trim() || !Number(target)) return;

    onUpdateGoals([
      ...goals,
      {
        id: crypto.randomUUID(),
        name,
        icon,
        target: Number(target),
        current: 0,
        color,
        isMain: goals.length === 0,
        isCompleted: false,
      },
    ]);

    setName("");
    setTarget("");
    setIcon("🎯");
    setColor("purple");
  }

  function normalizeGoals(nextGoals: Goal[]) {
    const activeGoals = nextGoals.filter((goal) => !goal.isCompleted);

    return nextGoals.map((goal) => ({
        ...goal,
        isMain:
        activeGoals.length > 0
            ? goal.id === activeGoals[0].id
            : false,
    }));
  }

  function updateGoal(id: string, field: keyof Goal, value: string | number | boolean) {
    onUpdateGoals(
      goals.map((goal) =>
        goal.id === id ? { ...goal, [field]: value } : goal
      )
    );
  }

  function setMainGoal(id: string) {
    const selectedGoal = goals.find((goal) => goal.id === id);

    if (!selectedGoal || selectedGoal.isCompleted) return;

    onUpdateGoals(
        goals.map((goal) => ({
        ...goal,
        isMain: goal.id === id,
        }))
    );
  }

  function deleteGoal(id: string) {
    const remainingGoals = goals.filter((goal) => goal.id !== id);
    onUpdateGoals(normalizeGoals(remainingGoals));
  }

  return (
    <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1623] p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold">Objectifs</h2>
        <p className="text-slate-400">
          Gère tes objectifs financiers et choisis celui affiché dans l’Aperçu.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-5 gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom"
          className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
        />

        <input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          type="number"
          placeholder="Objectif €"
          className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
        />

        <input
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="Icône"
          className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
        />

        <select
          value={color}
          onChange={(e) => setColor(e.target.value as Goal["color"])}
          className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
        >
          <option className="bg-[#0b1623]" value="blue">Bleu</option>
          <option className="bg-[#0b1623]" value="green">Vert</option>
          <option className="bg-[#0b1623]" value="purple">Violet</option>
          <option className="bg-[#0b1623]" value="orange">Orange</option>
          <option className="bg-[#0b1623]" value="yellow">Jaune</option>
        </select>

        <AnimatedButton
          onClick={addGoal}
          className="rounded-xl bg-purple-500 px-4 py-3 font-semibold text-white"
        >
          Ajouter
        </AnimatedButton>
      </div>

      <div className="h-full space-y-3 overflow-y-auto pr-2 pb-32">
        {goals.map((goal) => {
          const current = goal.isMain && !goal.isCompleted ? mainGoalCurrent : goal.current;
          const percent = Math.min(Math.round((current / goal.target) * 100), 100);

          return (
            <motion.div
  key={goal.id}
  layout
  animate={{
    opacity: goal.isCompleted ? 0.55 : 1,
    scale: goal.isCompleted ? 0.985 : 1,
  }}
  transition={{
    duration: 0.25,
    ease: "easeOut",
  }}
  className={`relative rounded-xl border bg-white/[0.03] px-5 py-4 ${
    goal.isCompleted
      ? "border-emerald-500/30"
      : "border-white/10"
  }`}
>
    {goal.isCompleted && (
  <motion.div
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    className="absolute right-4 top-4 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400"
  >
    ✓ Terminé
  </motion.div>
)}
              <div className="grid grid-cols-7 items-center gap-3">
                <input
                  value={goal.icon}
                  onChange={(e) => updateGoal(goal.id, "icon", e.target.value)}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-white outline-none"
                />

                <input
                  value={goal.name}
                  onChange={(e) => updateGoal(goal.id, "name", e.target.value)}
                  className={`col-span-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 outline-none ${
  goal.isCompleted
    ? "text-slate-500 line-through"
    : "text-white"
}`}
                />

                <input
                  value={goal.target}
                  type="number"
                  onChange={(e) => updateGoal(goal.id, "target", Number(e.target.value))}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-white outline-none"
                />

                <select
                  value={goal.color}
                  onChange={(e) => updateGoal(goal.id, "color", e.target.value)}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-white outline-none"
                >
                  <option className="bg-[#0b1623]" value="blue">Bleu</option>
                  <option className="bg-[#0b1623]" value="green">Vert</option>
                  <option className="bg-[#0b1623]" value="purple">Violet</option>
                  <option className="bg-[#0b1623]" value="orange">Orange</option>
                  <option className="bg-[#0b1623]" value="yellow">Jaune</option>
                </select>

                <AnimatedButton
                    disabled={goal.isCompleted}
                    onClick={() => setMainGoal(goal.id)}
                    className={`rounded-lg border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-30 ${
                        goal.isMain
                        ? colors[goal.color]
                        : "border-white/10 bg-white/[0.04] text-slate-300"
                    }`}
                >
                    Principal
                </AnimatedButton>

                <AnimatedButton
                  onClick={() => deleteGoal(goal.id)}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400"
                >
                  Supprimer
                </AnimatedButton>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <AnimatedButton
                    onClick={() => {
                        const updatedGoals = goals.map((item) =>
                        item.id === goal.id
                            ? { ...item, isCompleted: !item.isCompleted, isMain: false }
                            : item
                        );

                        onUpdateGoals(normalizeGoals(updatedGoals));
                    }}
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400"
                    >
                    {goal.isCompleted ? "↺ Réouvrir" : "✓ Accomplir"}
                </AnimatedButton>

                <div className="flex-1">
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-slate-400">
                      {current.toLocaleString("fr-FR")} € / {goal.target.toLocaleString("fr-FR")} €
                    </span>
                    <span className="text-slate-300">{percent}%</span>
                  </div>

                  <div className="h-2 rounded-full bg-white/10">
                    <motion.div
  className={`h-full rounded-full ${
  goal.isCompleted
    ? "bg-emerald-500"
    : bars[goal.color]
}`}
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
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}