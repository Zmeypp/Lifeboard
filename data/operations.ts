export type BudgetImpacts = Record<string, number>;

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

  /*
   * Clé = ID d'un budget de type "account"
   * Exemple :
   * {
   *   "compte-courant": -50,
   *   "livret-a": 50,
   * }
   */
  accountImpact: BudgetImpacts;

  /*
   * Clé = ID d'un budget de type "spending"
   * Exemple :
   * {
   *   "courses": -50,
   * }
   */
  budgetImpact: BudgetImpacts;
};

export const initialOperations: Operation[] = [];
