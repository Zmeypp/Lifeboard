export type Goal = {
  id: string;
  name: string;
  icon: string;
  target: number;
  current: number;
  color: "blue" | "green" | "purple" | "orange" | "yellow";
  isMain: boolean;
  isCompleted: boolean;
};

export const initialGoals: Goal[] = [
  {
    id: "mustang",
    name: "Mustang",
    icon: "🏎️",
    target: 22800,
    current: 0,
    color: "purple",
    isMain: true,
    isCompleted: false,
  },
];