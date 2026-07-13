"use client";

import { useEffect, useState } from "react";
import type { Operation } from "@/data/operations";
import AnimatedButton from "@/components/ui/AnimatedButton";
import type { Budget } from "@/data/budgets";

type OperationType = "expense" | "income" | "transfer";

type OperationFormProps = {
  budgets: Budget[];
  onAddOperation: (operation: Operation) => void;
};


const categories = {
  expense: [
    "Courses",
    "Abonnements",
    "Médecine",
    "Essence",
    "Logement",
    "Loisirs",
    "Restaurant",
    "Achats",
    "Imprévus",
  ],
  income: [
    "Salaire",
    "Cadeau",
    "Remboursement",
    "Prime",
    "Natixis",
    "Vente",
  ],
  transfer: [],
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
    inactiveClass:
      "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  },
  transfer: {
    label: "Transfert",
    activeClass: "bg-blue-500 text-white border-blue-400",
    inactiveClass: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  },
};

export default function OperationForm({
  budgets,
  onAddOperation,
}: OperationFormProps) {
  const [type, setType] = useState<OperationType>("expense");
  const [category, setCategory] = useState(categories.expense[0]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const accountBudgets = budgets.filter(
  (budget) => budget.type === "account",
);

const spendingBudgets = budgets.filter(
  (budget) => budget.type === "spending",
);


const [selectedBudgetId, setSelectedBudgetId] =
  useState("");

const [selectedAccountId, setSelectedAccountId] =
  useState("");

const [transferDestinationId, setTransferDestinationId] =
  useState("");


  useEffect(() => {
  if (
    !spendingBudgets.some(
      (budget) => budget.id === selectedBudgetId,
    )
  ) {
    setSelectedBudgetId(
      spendingBudgets[0]?.id ?? "",
    );
  }

  if (
    !accountBudgets.some(
      (budget) => budget.id === selectedAccountId,
    )
  ) {
    setSelectedAccountId(
      accountBudgets[0]?.id ?? "",
    );
  }

  if (
    !accountBudgets.some(
      (budget) =>
        budget.id === transferDestinationId,
    )
  ) {
    setTransferDestinationId(
      accountBudgets[1]?.id ??
        accountBudgets[0]?.id ??
        "",
    );
  }
}, [
  budgets,
  selectedBudgetId,
  selectedAccountId,
  transferDestinationId,
]);

  function selectType(nextType: OperationType) {
  setType(nextType);

  if (nextType !== "transfer") {
    setCategory(categories[nextType][0]);
  } else {
    setCategory("Transfert");
  }
}

  function handleAmountChange(value: string) {
    const sanitizedValue = value
      .replace(".", ",")
      .replace(/[^\d,]/g, "")
      .replace(/(,.*),/g, "$1");

    setAmount(sanitizedValue);
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
  const parsedAmount = Number(
    amount.replace(",", "."),
  );

  if (
    !Number.isFinite(parsedAmount) ||
    parsedAmount <= 0
  ) {
    return;
  }

  const accountImpact: Operation["accountImpact"] =
    {};

  const budgetImpact: Operation["budgetImpact"] =
    {};

  let operationTitle = category;
  let operationIcon = getIcon();

  if (type === "expense") {
    const selectedBudget = budgets.find(
      (budget) =>
        budget.id === selectedBudgetId &&
        budget.type === "spending",
    );

    if (
      !selectedBudget ||
      !selectedBudget.linkedAccountId
    ) {
      return;
    }

    const linkedAccount = budgets.find(
      (budget) =>
        budget.id ===
          selectedBudget.linkedAccountId &&
        budget.type === "account",
    );

    if (!linkedAccount) {
      return;
    }

    budgetImpact[selectedBudget.id] =
      -parsedAmount;

    accountImpact[linkedAccount.id] =
      -parsedAmount;

    operationTitle = description.trim()
      ? `${selectedBudget.name} - ${description.trim()}`
      : selectedBudget.name;

    operationIcon = selectedBudget.icon;
  }

  if (type === "income") {
    const selectedAccount = budgets.find(
      (budget) =>
        budget.id === selectedAccountId &&
        budget.type === "account",
    );

    if (!selectedAccount) {
      return;
    }

    accountImpact[selectedAccount.id] =
      parsedAmount;

    operationTitle = description.trim()
      ? `${category} - ${description.trim()}`
      : category;

    operationIcon = "💰";
  }

  if (type === "transfer") {
    if (
      !selectedAccountId ||
      !transferDestinationId ||
      selectedAccountId ===
        transferDestinationId
    ) {
      return;
    }

    const sourceAccount = budgets.find(
      (budget) =>
        budget.id === selectedAccountId &&
        budget.type === "account",
    );

    const destinationAccount = budgets.find(
      (budget) =>
        budget.id ===
          transferDestinationId &&
        budget.type === "account",
    );

    if (
      !sourceAccount ||
      !destinationAccount
    ) {
      return;
    }

    accountImpact[sourceAccount.id] =
      -parsedAmount;

    accountImpact[destinationAccount.id] =
      parsedAmount;

    operationTitle =
      `${sourceAccount.name} → ${destinationAccount.name}`;

    operationIcon = "🔁";
  }

  onAddOperation({
    id: Date.now(),
    date: new Date().toLocaleDateString(
      "fr-FR",
      {
        day: "2-digit",
        month: "2-digit",
      },
    ),
    createdAt: new Date().toISOString(),
    type,
    category:
      type === "expense"
        ? selectedBudgetId
        : category,
    icon: operationIcon,
    title: operationTitle,
    amount:
      type === "income"
        ? parsedAmount
        : -parsedAmount,
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
        {(["expense", "income", "transfer"] as OperationType[]).map(
          (item) => (
            <AnimatedButton
              key={item}
              type="button"
              onClick={() => selectType(item)}
              className={`rounded-xl border px-4 py-3 font-semibold transition ${
                type === item
                  ? typeConfig[item].activeClass
                  : typeConfig[item].inactiveClass
              }`}
            >
              {typeConfig[item].label}
            </AnimatedButton>
          ),
        )}
      </div>

      {type !== "transfer" && (
  <div>
    <label className="mb-2 block text-sm text-slate-400">
      Catégorie
    </label>

    <select
      value={category}
      onChange={(event) => setCategory(event.target.value)}
      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
    >
      {categories[type].map((item) => (
        <option
          key={item}
          className="bg-[#0b1623] text-white"
        >
          {item}
        </option>
      ))}
    </select>
  </div>
)}

      {type === "expense" && (
  <div>
    <label className="mb-2 block text-sm text-slate-400">
      Budget débité
    </label>

    <select
      value={selectedBudgetId}
      onChange={(event) =>
        setSelectedBudgetId(event.target.value)
      }
      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
    >
      {spendingBudgets.map((budget) => {
        const linkedAccount = accountBudgets.find(
          (account) =>
            account.id === budget.linkedAccountId,
        );

        return (
          <option
            key={budget.id}
            value={budget.id}
            className="bg-[#0b1623]"
          >
            {budget.icon} {budget.name}
            {linkedAccount
              ? ` → ${linkedAccount.name}`
              : " → aucun compte"}
          </option>
        );
      })}
    </select>
  </div>
)}

{type === "income" && (
  <div>
    <label className="mb-2 block text-sm text-slate-400">
      Compte crédité
    </label>

    <select
      value={selectedAccountId}
      onChange={(event) =>
        setSelectedAccountId(event.target.value)
      }
      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
    >
      {accountBudgets.map((budget) => (
        <option
          key={budget.id}
          value={budget.id}
          className="bg-[#0b1623]"
        >
          {budget.icon} {budget.name}
        </option>
      ))}
    </select>
  </div>
)}

{type === "transfer" && (
  <div className="grid grid-cols-2 gap-3">
    <div>
      <label className="mb-2 block text-sm text-slate-400">
        Depuis
      </label>

      <select
        value={selectedAccountId}
        onChange={(event) =>
          setSelectedAccountId(
            event.target.value,
          )
        }
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
      >
        {accountBudgets.map((budget) => (
          <option
            key={budget.id}
            value={budget.id}
            className="bg-[#0b1623]"
          >
            {budget.icon} {budget.name}
          </option>
        ))}
      </select>
    </div>

    <div>
      <label className="mb-2 block text-sm text-slate-400">
        Vers
      </label>

      <select
        value={transferDestinationId}
        onChange={(event) =>
          setTransferDestinationId(
            event.target.value,
          )
        }
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
      >
        {accountBudgets
          .filter(
            (budget) =>
              budget.id !== selectedAccountId,
          )
          .map((budget) => (
            <option
              key={budget.id}
              value={budget.id}
              className="bg-[#0b1623]"
            >
              {budget.icon} {budget.name}
            </option>
          ))}
      </select>
    </div>
  </div>
)}

      <div>
        <label className="mb-2 block text-sm text-slate-400">
          Montant
        </label>

        <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] px-2">
            <input
                value={amount}
                onChange={(event) =>
                handleAmountChange(event.target.value)
                }
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                placeholder="42,50"
                autoComplete="off"
                className="w-full bg-transparent px-2 py-3 text-white outline-none"
            />

            <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                if (!amount.includes(",")) {
                    setAmount((currentAmount) =>
                    currentAmount.length === 0
                        ? "0,"
                        : `${currentAmount},`
                    );
                }
                }}
                className="mr-2 rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-xl font-bold text-white active:bg-white/20"
            >
                ,
            </button>

            <span className="pr-2 text-slate-400">€</span>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm text-slate-400">
          Description
        </label>

        <input
          value={description}
          onChange={(event) =>
            setDescription(event.target.value)
          }
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
