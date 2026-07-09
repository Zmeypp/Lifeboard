"use client";

import { useState } from "react";
import type { Budget } from "@/data/budgets";
import AnimatedButton from "@/components/ui/AnimatedButton";

type BudgetPageProps = {
  budgets: Budget[];
  onUpdateBudgets: (budgets: Budget[]) => void;
};

export default function BudgetPage({ budgets, onUpdateBudgets }: BudgetPageProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [icon, setIcon] = useState("💰");
  const [color, setColor] = useState<Budget["color"]>("purple");

  function updateBudget(id: string, field: keyof Budget, value: string | number) {
    onUpdateBudgets(
      budgets.map((budget) =>
        budget.id === id ? { ...budget, [field]: value } : budget
      )
    );
  }

  function addBudget() {
    if (!name.trim() || !Number(amount)) return;

    onUpdateBudgets([
      ...budgets,
      {
        id: crypto.randomUUID(),
        name,
        amount: Number(amount),
        max: Number(amount),
        icon,
        color,
      },
    ]);

    setName("");
    setAmount("");
    setIcon("💰");
    setColor("purple");
  }

  function deleteBudget(id: string) {
    onUpdateBudgets(budgets.filter((budget) => budget.id !== id));
  }

  return (
    <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1623] p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold">Budgets</h2>
        <p className="text-slate-400">Gère tes montants, icônes et couleurs.</p>
      </div>

      <div className="mb-6 grid grid-cols-5 gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom" className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none" />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="Montant" className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none" />
        <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Icône" className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none" />
        <select value={color} onChange={(e) => setColor(e.target.value as Budget["color"])} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none">
          <option className="bg-[#0b1623]" value="blue">Bleu</option>
          <option className="bg-[#0b1623]" value="green">Vert</option>
          <option className="bg-[#0b1623]" value="purple">Violet</option>
          <option className="bg-[#0b1623]" value="orange">Orange</option>
          <option className="bg-[#0b1623]" value="yellow">Jaune</option>
        </select>
        <AnimatedButton onClick={addBudget} className="rounded-xl bg-purple-500 px-4 py-3 font-semibold text-white">
          Ajouter
        </AnimatedButton>
      </div>

      <div className="h-full space-y-3 overflow-y-auto pr-2 pb-32">
        {budgets.map((budget) => (
          <div key={budget.id} className="grid grid-cols-6 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4">
            <input value={budget.icon} onChange={(e) => updateBudget(budget.id, "icon", e.target.value)} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-white outline-none" />
            <input value={budget.name} onChange={(e) => updateBudget(budget.id, "name", e.target.value)} className="col-span-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-white outline-none" />
            <input value={budget.amount} type="number" onChange={(e) => updateBudget(budget.id, "amount", Number(e.target.value))} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-white outline-none" />
            <select value={budget.color} onChange={(e) => updateBudget(budget.id, "color", e.target.value)} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-white outline-none">
              <option className="bg-[#0b1623]" value="blue">Bleu</option>
              <option className="bg-[#0b1623]" value="green">Vert</option>
              <option className="bg-[#0b1623]" value="purple">Violet</option>
              <option className="bg-[#0b1623]" value="orange">Orange</option>
              <option className="bg-[#0b1623]" value="yellow">Jaune</option>
            </select>

            <AnimatedButton
              disabled={budget.locked}
              onClick={() => deleteBudget(budget.id)}
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Supprimer
            </AnimatedButton>
          </div>
        ))}
      </div>
    </div>
  );
}