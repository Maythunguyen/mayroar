export const MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks"] as const;
export type Meal = (typeof MEALS)[number];
export type Nutrients = {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};
export type CompleteNutrients = { [K in keyof Nutrients]: number };
export type Food = {
  licence?: string;
  sourceUrl?: string;
  portions?: { label: string; grams: number }[];
  extra?: { fibre: number | null; sugars: number | null };
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  sourceId: string;
  sourceFoodId: string;
  sourceName: string;
  sourceVersion: string;
  attribution: string;
  qualityTier: "reference" | "label" | "custom";
  per100g: Nutrients;
};
export type Entry = {
  id: number;
  day: string;
  meal: Meal;
  grams: number;
  food: Food;
};
export type Targets = CompleteNutrients;

export function localDay(date = new Date()): string {
  // A food diary uses the phone's calendar day, not the UTC date.
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function validDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && localDay(date) === value;
}

export function moveDay(day: string, difference: number): string {
  const date = new Date(`${day}T12:00:00`);
  date.setDate(date.getDate() + difference);
  return localDay(date);
}

export function formatDay(day: string): string {
  return new Date(`${day}T12:00:00`).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function readMeal(value: unknown): Meal {
  return MEALS.includes(value as Meal) ? (value as Meal) : "Breakfast";
}

export function decimal(value: string): number | null {
  // Accept decimal commas from phone keyboards, but never partial numbers or exponents.
  const cleaned = value.trim().replace(",", ".");
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function loggingIssue(food: Food): string | null {
  const values = food.per100g;
  const missing = Object.entries(values)
    .filter(([, v]) => v === null)
    .map(([key]) => key);
  if (missing.length)
    return `Missing ${missing.join(", ")}. Choose another result or enter the values from its label.`;
  for (const [key, value] of Object.entries(values)) {
    if (
      value === null ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > (key === "calories" ? 1000 : 100)
    ) {
      return "These values need a data check. Choose another result or enter the values from its label.";
    }
  }
  if (
    values.calories === 0 &&
    values.protein! + values.carbs! + values.fat! > 1
  ) {
    return "This food reports zero calories but contains macros. Check the label before logging it.";
  }
  return null;
}

export function portion(food: Food, grams: number): CompleteNutrients {
  const issue = loggingIssue(food);
  if (issue) throw new Error(issue);
  if (!Number.isFinite(grams) || grams <= 0 || grams > 10000)
    throw new Error("Enter a weight above 0 and no more than 10,000 g.");
  const factor = grams / 100;
  return {
    calories: food.per100g.calories! * factor,
    protein: food.per100g.protein! * factor,
    carbs: food.per100g.carbs! * factor,
    fat: food.per100g.fat! * factor,
  };
}

export function totals(entries: Entry[]): CompleteNutrients {
  return entries.reduce(
    (sum, entry) => {
      const amount = portion(entry.food, entry.grams);
      return {
        calories: sum.calories + amount.calories,
        protein: sum.protein + amount.protein,
        carbs: sum.carbs + amount.carbs,
        fat: sum.fat + amount.fat,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function numberLabel(value: number | null, decimals = 0): string {
  return value === null
    ? "—"
    : value.toLocaleString("en-AU", { maximumFractionDigits: decimals });
}

export function sourceLabel(food: Food): string {
  return food.qualityTier === "custom"
    ? "Your label entry"
    : `${food.sourceName} · ${food.qualityTier === "label" ? "Label data" : "Reference data"}`;
}
