"use client";

import { useEffect, useState } from "react";
import type { Budget } from "@/data/budgets";
import AnimatedButton from "@/components/ui/AnimatedButton";

type BudgetPageProps = {
  budgets: Budget[];
  onUpdateBudgets: (budgets: Budget[]) => void;
};

export default function BudgetPage({
  budgets,
  onUpdateBudgets,
}: BudgetPageProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [icon, setIcon] = useState("💰");
  const [color, setColor] = useState<Budget["color"]>("purple");

  const [budgetAmountInputs, setBudgetAmountInputs] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    setBudgetAmountInputs((currentInputs) => {
      const nextInputs: Record<string, string> = {};

      budgets.forEach((budget) => {
        nextInputs[budget.id] =
          currentInputs[budget.id] ?? String(budget.amount).replace(".", ",");
      });

      return nextInputs;
    });
  }, [budgets]);

  function sanitizeDecimalValue(value: string) {
    return value
      .replace(".", ",")
      .replace(/[^\d,]/g, "")
      .replace(/(,.*),/g, "$1");
  }

  function parseDecimalValue(value: string) {
    return Number(value.replace(",", "."));
  }

  function handleNewAmountChange(value: string) {
    setAmount(sanitizeDecimalValue(value));
  }

  function handleBudgetAmountChange(id: string, value: string) {
    const sanitizedValue = sanitizeDecimalValue(value);

    setBudgetAmountInputs((currentInputs) => ({
      ...currentInputs,
      [id]: sanitizedValue,
    }));
  }

  function saveBudgetAmount(id: string) {
    const inputValue = budgetAmountInputs[id] ?? "";
    const parsedAmount = parseDecimalValue(inputValue);

    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      const currentBudget = budgets.find((budget) => budget.id === id);

      setBudgetAmountInputs((currentInputs) => ({
        ...currentInputs,
        [id]: currentBudget
          ? String(currentBudget.amount).replace(".", ",")
          : "",
      }));

      return;
    }

    updateBudget(id, "amount", parsedAmount);

    setBudgetAmountInputs((currentInputs) => ({
      ...currentInputs,
      [id]: String(parsedAmount).replace(".", ","),
    }));
  }

  function updateBudget(
    id: string,
    field: keyof Budget,
    value: string | number,
  ) {
    onUpdateBudgets(
      budgets.map((budget) =>
        budget.id === id ? { ...budget, [field]: value } : budget,
      ),
    );
  }

  function addBudget() {
    const parsedAmount = parseDecimalValue(amount);

    if (
      !name.trim() ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    ) {
      return;
    }

    const newBudget: Budget = {
      id: crypto.randomUUID(),
      name: name.trim(),
      amount: parsedAmount,
      max: parsedAmount,
      icon,
      color,
    };

    onUpdateBudgets([...budgets, newBudget]);

    setName("");
    setAmount("");
    setIcon("💰");
    setColor("purple");
  }

  function deleteBudget(id: string) {
    onUpdateBudgets(budgets.filter((budget) => budget.id !== id));

    setBudgetAmountInputs((currentInputs) => {
      const nextInputs = { ...currentInputs };
      delete nextInputs[id];
      return nextInputs;
    });
  }

  return (
    <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1623] p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold">Budgets</h2>

        <p className="text-slate-400">
          Gère tes montants, icônes et couleurs.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-5 gap-3">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nom"
          className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
        />

        <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] px-2">
            <input
                value={amount}
                onChange={(event) =>
                handleNewAmountChange(event.target.value)
                }
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                placeholder="Montant"
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent px-2 py-3 text-white outline-none"
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
                className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-lg font-bold text-white active:bg-white/20"
            >
                ,
            </button>
        </div>

        <input
          value={icon}
          onChange={(event) => setIcon(event.target.value)}
          placeholder="Icône"
          className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
        />

        <select
          value={color}
          onChange={(event) =>
            setColor(event.target.value as Budget["color"])
          }
          className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
        >
          <option className="bg-[#0b1623]" value="blue">
            Bleu
          </option>

          <option className="bg-[#0b1623]" value="green">
            Vert
          </option>

          <option className="bg-[#0b1623]" value="purple">
            Violet
          </option>

          <option className="bg-[#0b1623]" value="orange">
            Orange
          </option>

          <option className="bg-[#0b1623]" value="yellow">
            Jaune
          </option>
        </select>

        <AnimatedButton
          type="button"
          onClick={addBudget}
          className="rounded-xl bg-purple-500 px-4 py-3 font-semibold text-white"
        >
          Ajouter
        </AnimatedButton>
      </div>

      <div className="h-full space-y-3 overflow-y-auto pr-2 pb-32">
        {budgets.map((budget) => (
          <div
            key={budget.id}
            className="grid grid-cols-6 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4"
          >
            <input
              value={budget.icon}
              onChange={(event) =>
                updateBudget(budget.id, "icon", event.target.value)
              }
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-white outline-none"
            />

            <input
              value={budget.name}
              onChange={(event) =>
                updateBudget(budget.id, "name", event.target.value)
              }
              className="col-span-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-white outline-none"
            />

            <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.04] px-2">
                <input
                    value={
                    budgetAmountInputs[budget.id] ??
                    String(budget.amount).replace(".", ",")
                    }
                    onChange={(event) =>
                    handleBudgetAmountChange(
                        budget.id,
                        event.target.value,
                    )
                    }
                    onBlur={() => saveBudgetAmount(budget.id)}
                    onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        saveBudgetAmount(budget.id);
                        event.currentTarget.blur();
                    }
                    }}
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    autoComplete="off"
                    className="min-w-0 flex-1 bg-transparent px-1 py-2 text-white outline-none"
                />

                <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                    const currentValue =
                        budgetAmountInputs[budget.id] ??
                        String(budget.amount).replace(".", ",");

                    if (!currentValue.includes(",")) {
                        setBudgetAmountInputs((currentInputs) => ({
                        ...currentInputs,
                        [budget.id]:
                            currentValue.length === 0
                            ? "0,"
                            : `${currentValue},`,
                        }));
                    }
                    }}
                    className="rounded-md border border-white/10 bg-white/10 px-2 py-1 text-lg font-bold text-white active:bg-white/20"
                >
                    ,
                </button>
            </div>

            <select
              value={budget.color}
              onChange={(event) =>
                updateBudget(
                  budget.id,
                  "color",
                  event.target.value,
                )
              }
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-white outline-none"
            >
              <option className="bg-[#0b1623]" value="blue">
                Bleu
              </option>

              <option className="bg-[#0b1623]" value="green">
                Vert
              </option>

              <option className="bg-[#0b1623]" value="purple">
                Violet
              </option>

              <option className="bg-[#0b1623]" value="orange">
                Orange
              </option>

              <option className="bg-[#0b1623]" value="yellow">
                Jaune
              </option>
            </select>

            <AnimatedButton
              type="button"
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