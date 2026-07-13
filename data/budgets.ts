export type BudgetColor =
  | "blue"
  | "green"
  | "purple"
  | "orange"
  | "yellow";

export type BudgetType =
  | "account"
  | "spending";

export type Budget = {
  id: string;
  name: string;
  amount: number;
  max: number;
  color: BudgetColor;
  icon: string;
  type: BudgetType;
  linkedAccountId?: string;
  locked?: boolean;
};

export const initialBudgets: Budget[] = [
  {
    id: "compte-courant",
    name: "Compte courant",
    amount: 826,
    max: 1000,
    color: "blue",
    icon: "💳",
    type: "account",
    locked: true,
  },
  {
    id: "livret-a",
    name: "Livret A",
    amount: 7700,
    max: 8000,
    color: "green",
    icon: "🐷",
    type: "account",
    locked: true,
  },
  {
    id: "courses",
    name: "Courses",
    amount: 250,
    max: 250,
    color: "orange",
    icon: "🛒",
    type: "spending",
    linkedAccountId: "compte-courant",
  },
  {
    id: "essence",
    name: "Essence",
    amount: 200,
    max: 200,
    color: "yellow",
    icon: "⛽",
    type: "spending",
    linkedAccountId: "compte-courant",
  },
  {
    id: "loisirs",
    name: "Loisirs",
    amount: 300,
    max: 300,
    color: "blue",
    icon: "🎮",
    type: "spending",
    linkedAccountId: "compte-courant",
  },
];
