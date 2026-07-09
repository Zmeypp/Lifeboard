"use client";

import { useState } from "react";
import type { Operation } from "@/data/operations";
import AnimatedButton from "@/components/ui/AnimatedButton";

type OperationType = "expense" | "income" | "transfer";

type OperationFormProps = {
  onAddOperation: (operation: Operation) => void;
};

const categories = {
  expense: ["Courses", "Abonnements", "Médecine", "Essence", "Logement", "Loisirs", "Restaurant", "Achats", "Imprévus"],
  income: ["Salaire", "Cadeau", "Remboursement", "Prime", "Natixis", "Vente"],
  transfer: ["Livret A → Compte courant", "Compte courant → Livret A"],
};

const typeConfig = {
  expense: {
    label: "Dépense",
    activeClass: "bg-rose-500 text-white border-rose-400",
    inactiveClass: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  },
  income: {
    label: "Revenu",
    activeClass: "bg-emerald-500 text-white border-emerald-400",
    inactiveClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  },
  transfer: {
    label: "Transfert",
    activeClass: "bg-blue-500 text-white border-blue-400",
    inactiveClass: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  },
};

export default function OperationForm({ onAddOperation }: OperationFormProps) {
  const [type, setType] = useState<OperationType>("expense");
  const [category, setCategory] = useState(categories.expense[0]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  function selectType(nextType: OperationType) {
    setType(nextType);
    setCategory(categories[nextType][0]);
  }

  function getIcon() {
    if (type === "income") return "💰";
    if (type === "transfer") return "🔁";
    if (category === "Essence") return "⛽";
    if (category === "Loisirs") return "🎮";
    if (category === "Restaurant") return "🍔";
    if (category === "Médecine") return "💊";
    if (category === "Abonnements") return "📺";
    return "🛒";
  }

  function handleSubmit() {
    const parsedAmount = Number(amount);
    if (!parsedAmount) return;

    const isIncome = type === "income";
    const isTransfer = type === "transfer";

    const accountImpact: Operation["accountImpact"] = {};
    const budgetImpact: Operation["budgetImpact"] = {};

    if (type === "expense") {
      accountImpact["Compte courant"] = -parsedAmount;

      if (category === "Courses") budgetImpact["Courses"] = -parsedAmount;
      if (category === "Essence") budgetImpact["Essence"] = -parsedAmount;
      if (["Abonnements", "Loisirs", "Restaurant"].includes(category)) {
        budgetImpact["Loisirs"] = -parsedAmount;
    }
    }

    if (type === "income") {
    accountImpact["Compte courant"] = parsedAmount;
    }

    if (type === "transfer") {
    if (category === "Livret A → Compte courant") {
        accountImpact["Livret A"] = -parsedAmount;
        accountImpact["Compte courant"] = parsedAmount;
    }

    if (category === "Compte courant → Livret A") {
        accountImpact["Compte courant"] = -parsedAmount;
        accountImpact["Livret A"] = parsedAmount;
    }
    }

    onAddOperation({
    id: Date.now(),
    date: new Date().toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
    }),
    createdAt: new Date().toISOString(),
    type,
    category,
    icon: getIcon(),
    title: description.trim() ? `${category} - ${description}` : category,
    amount: type === "income" ? parsedAmount : -parsedAmount,
    color:
        type === "income"
        ? "text-green-400"
        : type === "transfer"
        ? "text-blue-400"
        : "text-red-400",
    accountImpact,
    budgetImpact,
    });

    setAmount("");
    setDescription("");
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {(["expense", "income", "transfer"] as OperationType[]).map((item) => (
          <AnimatedButton
            key={item}
            type="button"
            onClick={() => selectType(item)}
            className={`rounded-xl border px-4 py-3 font-semibold transition ${
              type === item ? typeConfig[item].activeClass : typeConfig[item].inactiveClass
            }`}
          >
            {typeConfig[item].label}
          </AnimatedButton>
        ))}
      </div>

      <div>
        <label className="mb-2 block text-sm text-slate-400">Catégorie</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
        >
          {categories[type].map((item) => (
            <option key={item} className="bg-[#0b1623] text-white">
                {item}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm text-slate-400">Montant</label>
        <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] px-4">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            placeholder="42"
            className="w-full bg-transparent py-3 text-white outline-none"
          />
          <span className="text-slate-400">€</span>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm text-slate-400">Description</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex : Carrefour"
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
        />
      </div>

      <AnimatedButton
        type="button"
        onClick={handleSubmit}
        className="w-full rounded-xl bg-rose-500 px-4 py-4 font-semibold text-white transition hover:bg-rose-400"
      >
        Ajouter l’opération
      </AnimatedButton>
    </div>
  );
}