export type Account = "Compte courant" | "Livret A";
export type BudgetName = "Courses" | "Essence" | "Loisirs";

export type Operation = {
  id: number;
  date: string;
  createdAt: string;
  type: "expense" | "income" | "transfer";
  category: string;
  title: string;
  amount: number;
  color: string;
  icon: string;
  accountImpact: Partial<Record<Account, number>>;
  budgetImpact: Partial<Record<BudgetName, number>>;
};

export const initialOperations: Operation[] = [];