export type MealPlan = {
    generated_at: string;
    week_start: string;
    week_end: string;
    budget: {
        max: number;
        estimated: number;
    };
    days: MealDay[];
    shopping_list: Record<string, ShoppingItem[]>;
};

export type MealDay = {
    date: string;
    weekday: string;
    meal: {
        title: string;
        description: string;
        image_prompt: string;
        image_url?: string;
        prep_time: number;
        cook_time: number;
        total_time: number;
        estimated_cost: number;
        portions: number;
        difficulty: string;
    };
    ingredients: Ingredient[];
    recipe: RecipeStep[];
};

export type Ingredient = {
    name: string;
    quantity: number;
    unit: string;
    from_pantry: boolean;
};

export type RecipeStep = {
    step: number;
    text: string;
};

export type ShoppingItem = {
    name: string;
    quantity: number;
    unit: string;
    estimated_cost: number;
};
