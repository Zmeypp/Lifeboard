export type Budget = {
  id: string;
  name: string;
  amount: number;
  max: number;
  color: "blue" | "green" | "purple" | "orange" | "yellow";
  icon: string;
  locked?: boolean;
};

export const initialBudgets: Budget[] = [
  { id: "compte-courant", name: "Compte courant", amount: 826, max: 1000, color: "blue", icon: "💳", locked: true },
  { id: "livret-a", name: "Livret A", amount: 7700, max: 8000, color: "green", icon: "🐷", locked: true },
  { id: "courses", name: "Courses", amount: 250, max: 250, color: "orange", icon: "🛒" },
  { id: "essence", name: "Essence", amount: 200, max: 200, color: "yellow", icon: "⛽" },
  { id: "loisirs", name: "Loisirs", amount: 300, max: 300, color: "blue", icon: "🎮" },
];