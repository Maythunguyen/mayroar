import type { Food } from "../domain/nutrition";

export type FoodRow = {
  source_licence?: string;
  source_url?: string;
  portions?: { label: string; grams: number }[];
  fibre_g?: number | string | null;
  sugars_g?: number | string | null;
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  source_id: string;
  source_food_id: string;
  source_name: string;
  source_version: string;
  source_attribution: string;
  quality_tier: Food["qualityTier"];
  energy_kcal: number | string | null;
  protein_g: number | string | null;
  carbs_available_g: number | string | null;
  fat_g: number | string | null;
  carbs_basis: string | null;
};

function nutrient(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    typeof value === "boolean"
  )
    return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

export function mapFood(row: FoodRow): Food {
  return {
    licence: row.source_licence,
    sourceUrl: row.source_url,
    portions: (row.portions ?? []).filter(
      (item) => Number.isFinite(item.grams) && item.grams > 0,
    ),
    extra: { fibre: nutrient(row.fibre_g), sugars: nutrient(row.sugars_g) },
    id: row.id,
    name: row.name,
    brand: row.brand,
    barcode: row.barcode,
    sourceId: row.source_id,
    sourceFoodId: row.source_food_id,
    sourceName: row.source_name,
    sourceVersion: row.source_version,
    attribution: row.source_attribution,
    qualityTier: row.quality_tier,
    per100g: {
      calories: nutrient(row.energy_kcal),
      protein: nutrient(row.protein_g),
      carbs: row.carbs_basis ? nutrient(row.carbs_available_g) : null,
      fat: nutrient(row.fat_g),
    },
  };
}

const apiUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
const apiKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const catalogueConfigured = Boolean(apiUrl && apiKey);

// URLSearchParams encodes the URL; this escaping separately protects PostgREST's filter syntax.
function quotedPattern(term: string): string {
  return '"*' + term.replace(/[\\%_*]/g, "\\$&").replace(/"/g, '\\"') + '*"';
}

export function searchParameters(
  query: string,
  barcode?: string,
): URLSearchParams {
  const params = new URLSearchParams({
    select:
      "id,name,brand,barcode,source_id,source_food_id,source_name,source_version,source_attribution,source_licence,source_url,quality_tier,energy_kcal,protein_g,carbs_available_g,carbs_basis,fat_g,fibre_g,sugars_g,portions",
    limit: "30",
    order: "name.asc,id.asc",
  });
  if (barcode) {
    if (!/^\d{8,14}$/.test(barcode))
      throw new Error("Enter a barcode with 8 to 14 digits.");
    // Preserve leading zeros. UPC-A is sometimes reported as an EAN-13 with a leading zero.
    const candidates = [barcode];
    if (barcode.length === 12) candidates.push("0" + barcode);
    if (barcode.length === 13 && barcode.startsWith("0"))
      candidates.push(barcode.slice(1));
    params.set("barcode", `in.(${candidates.join(",")})`);
  } else {
    const words = query
      .trim()
      .slice(0, 80)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 6);
    if (!words.length) throw new Error("Type a food or brand name.");
    params.set(
      "and",
      "(" +
        words
          .map(
            (word) =>
              `or(name.ilike.${quotedPattern(word)},brand.ilike.${quotedPattern(word)})`,
          )
          .join(",") +
        ")",
    );
  }
  return params;
}

export async function searchFoods(
  query: string,
  signal: AbortSignal,
  barcode?: string,
): Promise<Food[]> {
  if (!catalogueConfigured) return [];
  const response = await fetch(
    `${apiUrl}/rest/v1/food_search?${searchParameters(query, barcode).toString()}`,
    {
      // Publishable keys are intended for clients; never use a secret/service-role key here.
      headers: {
        apikey: apiKey!,
        ...(apiKey!.startsWith("eyJ")
          ? { Authorization: `Bearer ${apiKey}` }
          : {}),
      },
      signal,
    },
  );
  if (!response.ok) {
    if (response.status === 401 || response.status === 403)
      throw new Error(
        "Food search is not available. Check the app’s public API configuration.",
      );
    throw new Error("Could not load the food catalogue. Please try again.");
  }
  const rows: unknown = await response.json();
  if (!Array.isArray(rows))
    throw new Error("The food catalogue returned an unexpected response.");
  return (rows as FoodRow[]).map(mapFood);
}
