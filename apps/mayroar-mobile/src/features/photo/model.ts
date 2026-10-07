import { decimal, loggingIssue, type Food } from "../../domain/nutrition";

export const FIELDS = ["grams", "calories", "protein", "carbs", "fat"] as const;
export type FieldKey = (typeof FIELDS)[number];
export type Draft = {
  name: string;
  assumptions: string;
  values: Record<FieldKey, string>;
};

export function parseEstimate(value: unknown): Draft {
  if (!value || typeof value !== "object") throw new Error("Invalid estimate.");
  const data = value as Record<string, unknown>;
  if (data.isFood === false) throw new Error("No clear food found. Choose a clearer photo.");
  if (data.isFood !== true || typeof data.name !== "string" || !data.name.trim() ||
      typeof data.assumptions !== "string" || FIELDS.some(key =>
        typeof data[key] !== "number" || !Number.isFinite(data[key]) || data[key] < 0) ||
      (data.grams as number) <= 0 || (data.grams as number) > 10000) {
    throw new Error("The server returned an invalid estimate. Please try again.");
  }
  return {
    name: data.name,
    assumptions: data.assumptions,
    values: Object.fromEntries(FIELDS.map(key => [key, String(data[key])])) as Draft["values"],
  };
}

export function toDiaryFood(draft: Draft, id: string): { food: Food; grams: number } {
  const values = {} as Record<FieldKey, number>;
  for (const key of FIELDS) {
    const value = decimal(draft.values[key]);
    if (value === null) throw new Error(`Enter a valid ${key} value.`);
    values[key] = value;
  }
  if (!draft.name.trim() || draft.name.trim().length > 120)
    throw new Error("Enter a food name of 1–120 characters.");
  if (values.grams <= 0 || values.grams > 10000)
    throw new Error("Enter a portion weight above 0 and up to 10,000 g.");
  const factor = 100 / values.grams;
  const food: Food = {
    id, name: `${draft.name.trim()} (photo estimate)`, brand: null, barcode: null,
    sourceId: "ai-photo", sourceFoodId: id, sourceName: "AI photo estimate",
    sourceVersion: "1", attribution: `User-reviewed estimate. ${draft.assumptions}`,
    qualityTier: "custom",
    per100g: {
      calories: values.calories * factor, protein: values.protein * factor,
      carbs: values.carbs * factor, fat: values.fat * factor,
    },
  };
  const issue = loggingIssue(food);
  if (issue) throw new Error(issue);
  return { food, grams: values.grams };
}
