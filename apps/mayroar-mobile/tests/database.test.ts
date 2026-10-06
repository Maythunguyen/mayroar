import assert from "node:assert/strict";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  addEntry,
  customFoods,
  deleteEntry,
  deleteLocalData,
  entriesForDay,
  initialiseDatabase,
  readTargets,
  saveCustomFood,
  saveTargets,
  updateEntry,
  recentFoods,
  favouriteFoods,
  toggleFavourite,
  type Database,
} from "../src/data/database";
import type { Food } from "../src/domain/nutrition";

const food: Food = {
  id: "test:1",
  sourceId: "test",
  sourceFoodId: "1",
  sourceName: "Test only",
  sourceVersion: "1",
  attribution: "Synthetic fixture",
  name: "Test food",
  brand: null,
  barcode: null,
  qualityTier: "reference",
  per100g: { calories: 100, protein: 10, carbs: 10, fat: 2 },
};

// Real SQLite with the same async method surface used by expo-sqlite.
function adapter(connection: DatabaseSync): Database {
  return {
    execAsync: async (sql: string) => {
      connection.exec(sql);
    },
    runAsync: async (sql: string, ...parameters: (string | number | null)[]) =>
      connection.prepare(sql).run(...parameters),
    getAllAsync: async (
      sql: string,
      ...parameters: (string | number | null)[]
    ) => connection.prepare(sql).all(...parameters),
    getFirstAsync: async (
      sql: string,
      ...parameters: (string | number | null)[]
    ) => connection.prepare(sql).get(...parameters) ?? null,
    withTransactionAsync: async (task: () => Promise<void>) => {
      connection.exec("BEGIN");
      try {
        await task();
        connection.exec("COMMIT");
      } catch (error) {
        connection.exec("ROLLBACK");
        throw error;
      }
    },
  } as unknown as Database;
}

test("diary survives reopening, keeps the original food snapshot, and stays on the chosen date", async () => {
  const directory = mkdtempSync(join(tmpdir(), "mayroar-test-"));
  let connection = new DatabaseSync(join(directory, "diary.db"));
  try {
    let db = adapter(connection);
    await initialiseDatabase(db);
    await initialiseDatabase(db); // Migration is safe on subsequent app launches.
    const selected = structuredClone(food);
    await addEntry(db, "2026-10-01", "Lunch", selected, 125);
    selected.per100g.calories = 999;
    connection.close();
    connection = new DatabaseSync(join(directory, "diary.db"));
    db = adapter(connection);
    const entries = await entriesForDay(db, "2026-10-01");
    assert.equal(entries.length, 1);
    assert.equal(entries[0].food.per100g.calories, 100);
    assert.equal(entries[0].food.sourceFoodId, "1");
    assert.equal(entries[0].meal, "Lunch");
    assert.equal((await entriesForDay(db, "2026-10-02")).length, 0);
    await updateEntry(db, entries[0], 200, "Dinner");
    const edited = (await entriesForDay(db, "2026-10-01"))[0];
    assert.equal(edited.grams, 200);
    assert.equal(edited.meal, "Dinner");
    assert.equal(edited.food.per100g.calories, 100);
    await addEntry(db, "2026-10-01", "Snacks", food, 50);
    assert.equal((await recentFoods(db)).length, 1);
    await deleteEntry(db, entries[0].id);
    assert.equal((await entriesForDay(db, "2026-10-01")).length, 1);
  } finally {
    connection.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("invalid input is rejected; target and personal-food deletion removes all local records", async () => {
  const connection = new DatabaseSync(":memory:");
  const db = adapter(connection);
  try {
    await initialiseDatabase(db);
    await assert.rejects(addEntry(db, "2026-02-30", "Lunch", food, 100));
    await assert.rejects(addEntry(db, "2026-10-01", "Lunch", food, -1));
    await saveCustomFood(db, { ...food, qualityTier: "custom" });
    await addEntry(db, "2026-10-01", "Lunch", food, 100);
    await saveTargets(db, {
      calories: 2000,
      protein: 100,
      carbs: 200,
      fat: 60,
    });
    assert.equal((await customFoods(db, "test")).length, 1);
    assert.equal((await readTargets(db))?.calories, 2000);
    assert.equal(await toggleFavourite(db, food), true);
    assert.equal((await favouriteFoods(db)).length, 1);
    assert.equal(await toggleFavourite(db, food), false);
    assert.equal((await favouriteFoods(db)).length, 0);
    await toggleFavourite(db, food);
    await deleteLocalData(db);
    assert.equal((await customFoods(db)).length, 0);
    assert.equal((await entriesForDay(db, "2026-10-01")).length, 0);
    assert.equal(await readTargets(db), null);
    assert.deepEqual(await favouriteFoods(db), []);
  } finally {
    connection.close();
  }
});
