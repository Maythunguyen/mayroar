import type { SQLiteDatabase } from "expo-sqlite";
import {
  type Entry,
  type Food,
  type Meal,
  type Targets,
  MEALS,
  portion,
  validDay,
} from "../domain/nutrition";

export type Database = Pick<
  SQLiteDatabase,
  | "execAsync"
  | "runAsync"
  | "getAllAsync"
  | "getFirstAsync"
  | "withTransactionAsync"
>;

export async function initialiseDatabase(db: Database): Promise<void> {
  await db.execAsync(
    "PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA secure_delete = ON;",
  );
  const version = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  if ((version?.user_version ?? 0) > 1)
    throw new Error("This diary needs a newer version of MayRoar.");
  if (version?.user_version === 1) return;
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      CREATE TABLE entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day TEXT NOT NULL,
        meal TEXT NOT NULL CHECK (meal IN ('Breakfast','Lunch','Dinner','Snacks')),
        grams REAL NOT NULL CHECK (grams > 0 AND grams <= 10000),
        food_id TEXT NOT NULL,
        source_id TEXT NOT NULL,
        source_food_id TEXT NOT NULL,
        food_snapshot TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
      CREATE INDEX entries_day ON entries(day);
      CREATE TABLE custom_foods (id TEXT PRIMARY KEY, food_json TEXT NOT NULL);
      CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      PRAGMA user_version = 1;
    `);
  });
}

export async function entriesForDay(
  db: Database,
  day: string,
): Promise<Entry[]> {
  const rows = await db.getAllAsync<{
    id: number;
    day: string;
    meal: Meal;
    grams: number;
    food_snapshot: string;
  }>(
    "SELECT id, day, meal, grams, food_snapshot FROM entries WHERE day = ? ORDER BY id",
    day,
  );
  return rows.map(({ food_snapshot, ...row }) => ({
    ...row,
    food: JSON.parse(food_snapshot) as Food,
  }));
}

export async function addEntry(
  db: Database,
  day: string,
  meal: Meal,
  food: Food,
  grams: number,
): Promise<void> {
  if (!validDay(day) || !MEALS.includes(meal))
    throw new Error("Choose a valid day and meal.");
  portion(food, grams); // Validate at the persistence boundary, as well as in the form.
  await db.runAsync(
    "INSERT INTO entries (day, meal, grams, food_id, source_id, source_food_id, food_snapshot) VALUES (?, ?, ?, ?, ?, ?, ?)",
    day,
    meal,
    grams,
    food.id,
    food.sourceId,
    food.sourceFoodId,
    JSON.stringify(food),
  );
}

export async function deleteEntry(db: Database, id: number): Promise<void> {
  await db.runAsync("DELETE FROM entries WHERE id = ?", id);
}

export async function updateEntry(
  db: Database,
  entry: Entry,
  grams: number,
  meal: Meal,
): Promise<void> {
  portion(entry.food, grams);
  if (!MEALS.includes(meal)) throw new Error("Choose a meal.");
  await db.runAsync(
    "UPDATE entries SET grams = ?, meal = ? WHERE id = ?",
    grams,
    meal,
    entry.id,
  );
}

export async function recentFoods(db: Database): Promise<Food[]> {
  const rows = await db.getAllAsync<{ food_snapshot: string }>(
    "SELECT food_snapshot FROM entries ORDER BY id DESC LIMIT 100",
  );
  const unique = new Map<string, Food>();
  for (const row of rows) {
    const food = JSON.parse(row.food_snapshot) as Food;
    if (!unique.has(food.id)) unique.set(food.id, food);
  }
  return [...unique.values()].slice(0, 10);
}

export async function favouriteFoods(db: Database): Promise<Food[]> {
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    "favourites",
  );
  return row ? (JSON.parse(row.value) as Food[]) : [];
}

export async function toggleFavourite(
  db: Database,
  food: Food,
): Promise<boolean> {
  const saved = await favouriteFoods(db);
  const adding = !saved.some((item) => item.id === food.id);
  const next = adding
    ? [food, ...saved]
    : saved.filter((item) => item.id !== food.id);
  await db.runAsync(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    "favourites",
    JSON.stringify(next),
  );
  return adding;
}

export async function customFoods(db: Database, query = ""): Promise<Food[]> {
  const rows = await db.getAllAsync<{ food_json: string }>(
    "SELECT food_json FROM custom_foods ORDER BY rowid DESC",
  );
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return rows
    .map((row) => JSON.parse(row.food_json) as Food)
    .filter((food) =>
      words.every((word) =>
        `${food.name} ${food.brand ?? ""}`.toLocaleLowerCase().includes(word),
      ),
    );
}

export async function saveCustomFood(db: Database, food: Food): Promise<void> {
  portion(food, 100);
  await db.runAsync(
    "INSERT INTO custom_foods (id, food_json) VALUES (?, ?)",
    food.id,
    JSON.stringify(food),
  );
}

export async function readTargets(db: Database): Promise<Targets | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    "targets",
  );
  return row ? (JSON.parse(row.value) as Targets) : null;
}

export async function saveTargets(
  db: Database,
  targets: Targets,
): Promise<void> {
  if (Object.values(targets).some((n) => !Number.isFinite(n) || n <= 0))
    throw new Error("All targets must be above zero.");
  await db.runAsync(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    "targets",
    JSON.stringify(targets),
  );
}

export async function deleteLocalData(db: Database): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.execAsync(
      "DELETE FROM entries; DELETE FROM custom_foods; DELETE FROM settings;",
    );
  });
  await db.execAsync("PRAGMA wal_checkpoint(TRUNCATE); VACUUM;");
}
