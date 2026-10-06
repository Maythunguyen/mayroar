import assert from "node:assert/strict";
import { test } from "node:test";
import {
  decimal,
  localDay,
  loggingIssue,
  moveDay,
  portion,
  totals,
  validDay,
  type Food,
} from "../src/domain/nutrition";
import {
  mapFood,
  searchParameters,
  type FoodRow,
} from "../src/data/foodSearch";

// Synthetic test fixture: this is never shown as a real catalogue food.
export const fixture: Food = {
  id: "test:1",
  name: "Test food",
  brand: null,
  barcode: null,
  sourceId: "test",
  sourceFoodId: "1",
  sourceName: "Test source",
  sourceVersion: "test",
  attribution: "Test only",
  qualityTier: "reference",
  per100g: { calories: 200, protein: 10, carbs: 30, fat: 4 },
};

test("scales grams, preserves precision until display, and sums different meals", () => {
  assert.deepEqual(portion(fixture, 125), {
    calories: 250,
    protein: 12.5,
    carbs: 37.5,
    fat: 5,
  });
  const sum = totals(
    [25, 75].map((grams, index) => ({
      id: index,
      day: "2026-10-01",
      meal: "Breakfast",
      grams,
      food: fixture,
    })),
  );
  assert.deepEqual(sum, fixture.per100g);
});

test("missing is not zero and unusable data cannot enter the diary", () => {
  assert.match(
    loggingIssue({
      ...fixture,
      per100g: { ...fixture.per100g, protein: null },
    })!,
    /Missing protein/,
  );
  assert.equal(
    loggingIssue({
      ...fixture,
      per100g: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    }),
    null,
  );
  for (const grams of [0, -1, NaN, Infinity, 10001])
    assert.throws(() => portion(fixture, grams));
  assert.throws(() =>
    portion({ ...fixture, per100g: { ...fixture.per100g, fat: 101 } }, 100),
  );
  assert.throws(() =>
    portion({ ...fixture, per100g: { ...fixture.per100g, calories: 0 } }, 100),
  );
});

test("accepts decimal-comma keyboards and rejects partial or malformed amounts", () => {
  assert.equal(decimal("12,5"), 12.5);
  assert.equal(decimal("0"), 0);
  for (const value of ["", " ", "1e3", "12g", "1.2.3", "-5", "Infinity"])
    assert.equal(decimal(value), null);
});

test("calendar dates survive month/year changes and Sydney midnight", () => {
  assert.equal(moveDay("2026-10-01", -1), "2026-09-30");
  assert.equal(moveDay("2026-12-31", 1), "2027-01-01");
  assert.equal(validDay("2026-02-30"), false);
  assert.equal(validDay("2028-02-29"), true);
  const old = process.env.TZ;
  process.env.TZ = "Australia/Sydney";
  try {
    assert.equal(localDay(new Date("2026-09-30T14:15:00Z")), "2026-10-01");
  } finally {
    if (old === undefined) delete process.env.TZ;
    else process.env.TZ = old;
  }
});

test("maps database decimals without changing missing values into zero", () => {
  const row: FoodRow = {
    id: "test:2",
    name: "Missing data test",
    brand: null,
    barcode: "0123456789012",
    source_id: "test",
    source_food_id: "2",
    source_name: "Test",
    source_version: "test",
    source_attribution: "Test only",
    quality_tier: "label",
    energy_kcal: "0",
    protein_g: null,
    carbs_available_g: 0,
    carbs_basis: null,
    fat_g: "0",
  };
  assert.deepEqual(mapFood(row).per100g, {
    calories: 0,
    protein: null,
    carbs: null,
    fat: 0,
  });
  assert.equal(mapFood(row).barcode, "0123456789012");
});

test("search uses AND between words, handles punctuation and preserves barcode zeroes", () => {
  const words = searchParameters("greek yoghurt").get("and")!;
  assert.equal(
    words,
    '(or(name.ilike."*greek*",brand.ilike."*greek*"),or(name.ilike."*yoghurt*",brand.ilike."*yoghurt*"))',
  );
  const special = searchParameters('Brand,_(A)"').get("and")!;
  assert.ok(special.includes("\\_"));
  assert.ok(special.includes('\\"'));
  assert.equal(
    searchParameters("", "0123456789012").get("barcode"),
    "in.(0123456789012,123456789012)",
  );
  assert.throws(() => searchParameters("", "123)or(true"));
});
