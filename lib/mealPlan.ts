import type { MealPlan } from "@/types/mealPlan";

export async function getMealPlan(): Promise<MealPlan | null> {
    try {
        const response = await fetch("/data/lifeboard_meal_plan.json", {
            cache: "no-store",
        });

        if (!response.ok) return null;

        return await response.json();
    } catch {
        return null;
    }
}
