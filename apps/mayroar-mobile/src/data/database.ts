import { randomUUID } from "expo-crypto";
import type { ApiClient } from "./apiClient";
import type {
  CompleteNutrients,
  Entry,
  Food,
  Meal,
  Targets,
} from "../domain/nutrition";

export type Database = ApiClient;

export type Diary = {
  entries: Entry[];
  totals: CompleteNutrients;
  meals: Record<Meal, CompleteNutrients>;
  extra: Record<
    "fibre" | "sugars",
    { value: number; missing: number }
  >;
};

export async function diaryForDay(
  db: Database,
  day: string,
): Promise<Diary> {
  return db.request<Diary>(
    `/diary?day=${encodeURIComponent(day)}`,
  );
}

export async function entriesForDay(
  db: Database,
  day: string,
): Promise<Entry[]> {
  const diary = await diaryForDay(db, day);
  return diary.entries;
}

export async function addEntry(
  db: Database,
  day: string,
  meal: Meal,
  food: Food,
  grams: number,
): Promise<void> {
  await db.request("/entries", {
    method: "POST",
    body: JSON.stringify({
      requestId: randomUUID(),
      day,
      meal,
      food,
      grams,
    }),
  });
}

export async function deleteEntry(
  db: Database,
  id: number,
): Promise<void> {
  await db.request(`/entries/${id}`, {
    method: "DELETE",
  });
}

export async function updateEntry(
  db: Database,
  entry: Entry,
  grams: number,
  meal: Meal,
): Promise<void> {
  await db.request(`/entries/${entry.id}`, {
    method: "PATCH",
    body: JSON.stringify({ grams, meal }),
  });
}

export async function recentFoods(
  db: Database,
): Promise<Food[]> {
  return db.request<Food[]>("/recent-foods");
}

export async function favouriteFoods(
  db: Database,
): Promise<Food[]> {
  return db.request<Food[]>("/favourites");
}

export async function toggleFavourite(
  db: Database,
  food: Food,
): Promise<boolean> {
  return db.request<boolean>("/favourites/toggle", {
    method: "POST",
    body: JSON.stringify(food),
  });
}

export async function customFoods(
  db: Database,
  query = "",
): Promise<Food[]> {
  const q = encodeURIComponent(query.slice(0, 80));
  return db.request<Food[]>(`/custom-foods?q=${q}`);
}

export async function saveCustomFood(
  db: Database,
  food: Food,
): Promise<void> {
  await db.request("/custom-foods", {
    method: "POST",
    body: JSON.stringify(food),
  });
}

export async function readTargets(
  db: Database,
): Promise<Targets | null> {
  return db.request<Targets | null>("/targets");
}

export async function saveTargets(
  db: Database,
  targets: Targets,
): Promise<void> {
  await db.request("/targets", {
    method: "PUT",
    body: JSON.stringify(targets),
  });
}

export async function deleteAccountDiary(
  db: Database,
): Promise<void> {
  await db.request("/diary-data", {
    method: "DELETE",
  });
}