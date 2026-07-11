"use client";

import { useState } from "react";
import type { Operation } from "@/data/operations";
import AnimatedButton from "@/components/ui/AnimatedButton";

type Filter = "all" | "expense" | "income" | "transfer";

type OperationsPageProps = {
  operations: Operation[];
  onDeleteOperation: (id: number) => void;
  onUpdateOperation: (operation: Operation) => void;
};

export default function OperationsPage({
  operations,
  onDeleteOperation,
  onUpdateOperation,
}: OperationsPageProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");

  const filteredOperations = operations.filter((operation) => {
    const matchesSearch =
      operation.title.toLowerCase().includes(search.toLowerCase()) ||
      operation.category.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = filter === "all" || operation.type === filter;

    return matchesSearch && matchesFilter;
  });

  function sanitizeDecimalValue(value: string) {
    return value
      .replace(".", ",")
      .replace(/[^\d,]/g, "")
      .replace(/(,.*),/g, "$1");
  }

  function parseDecimalValue(value: string) {
    return Number(value.replace(",", "."));
  }

  function handleEditAmountChange(value: string) {
    setEditAmount(sanitizeDecimalValue(value));
  }

  function startEdit(operation: Operation) {
    setEditingId(operation.id);
    setEditTitle(operation.title);
    setEditAmount(
      String(Math.abs(operation.amount)).replace(".", ","),
    );
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditAmount("");
  }

  function saveEdit(operation: Operation) {
    const parsedAmount = parseDecimalValue(editAmount);

    if (
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0 ||
      !editTitle.trim()
    ) {
      return;
    }

    const sign = operation.amount >= 0 ? 1 : -1;

    const updatedAccountImpact = Object.fromEntries(
      Object.entries(operation.accountImpact).map(([key, value]) => [
        key,
        value >= 0 ? parsedAmount : -parsedAmount,
      ]),
    ) as Operation["accountImpact"];

    const updatedBudgetImpact = Object.fromEntries(
      Object.entries(operation.budgetImpact).map(([key, value]) => [
        key,
        value >= 0 ? parsedAmount : -parsedAmount,
      ]),
    ) as Operation["budgetImpact"];

    onUpdateOperation({
      ...operation,
      title: editTitle.trim(),
      amount: parsedAmount * sign,
      accountImpact: updatedAccountImpact,
      budgetImpact: updatedBudgetImpact,
    });

    cancelEdit();
  }

  return (
    <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1623] p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Opérations</h2>

          <p className="text-slate-400">
            Historique complet de tes dépenses, revenus et transferts.
          </p>
        </div>
      </div>

      <div className="mb-5 flex gap-4">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher une opération..."
          className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
        />

        <select
          value={filter}
          onChange={(event) =>
            setFilter(event.target.value as Filter)
          }
          className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
        >
          <option className="bg-[#0b1623]" value="all">
            Toutes
          </option>

          <option className="bg-[#0b1623]" value="expense">
            Dépenses
          </option>

          <option className="bg-[#0b1623]" value="income">
            Revenus
          </option>

          <option className="bg-[#0b1623]" value="transfer">
            Transferts
          </option>
        </select>
      </div>

      <div className="h-full space-y-3 overflow-y-auto pr-2 pb-32">
        {filteredOperations.map((operation) => {
          const isEditing = editingId === operation.id;

          return (
            <div
              key={operation.id}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4"
            >
              <div className="flex flex-1 items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-lg">
                  {operation.icon}
                </div>

                {isEditing ? (
                  <div className="flex flex-1 gap-3">
                    <input
                      value={editTitle}
                      onChange={(event) =>
                        setEditTitle(event.target.value)
                      }
                      className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-white outline-none"
                    />

                    <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.04] px-2">
                        <input
                            value={editAmount}
                            onChange={(event) =>
                            handleEditAmountChange(event.target.value)
                            }
                            onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                saveEdit(operation);
                            }
                            }}
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*[.,]?[0-9]*"
                            autoComplete="off"
                            placeholder="0,00"
                            className="w-24 bg-transparent px-1 py-2 text-white outline-none"
                        />

                        <button
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                            if (!editAmount.includes(",")) {
                                setEditAmount((currentAmount) =>
                                currentAmount.length === 0
                                    ? "0,"
                                    : `${currentAmount},`
                                );
                            }
                            }}
                            className="mr-2 rounded-md border border-white/10 bg-white/10 px-2 py-1 text-lg font-bold text-white active:bg-white/20"
                        >
                            ,
                        </button>

                        <span className="text-slate-400">€</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-white">
                      {operation.title}
                    </p>

                    <p className="text-sm text-slate-400">
                      {operation.date} · {operation.category}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                {!isEditing && (
                  <p
                    className={`text-xl font-bold ${operation.color}`}
                  >
                    {operation.amount > 0 ? "+" : ""}
                    {operation.amount.toLocaleString("fr-FR")} €
                  </p>
                )}

                {isEditing ? (
                  <>
                    <AnimatedButton
                      type="button"
                      onClick={() => saveEdit(operation)}
                      className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400 hover:bg-emerald-500/20"
                    >
                      Valider
                    </AnimatedButton>

                    <AnimatedButton
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300 hover:bg-white/10"
                    >
                      Annuler
                    </AnimatedButton>
                  </>
                ) : (
                  <>
                    <AnimatedButton
                      type="button"
                      onClick={() => startEdit(operation)}
                      className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm text-blue-400 hover:bg-blue-500/20"
                    >
                      Modifier
                    </AnimatedButton>

                    <AnimatedButton
                      type="button"
                      onClick={() =>
                        onDeleteOperation(operation.id)
                      }
                      className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20"
                    >
                      Supprimer
                    </AnimatedButton>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
