import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { entriesForDay, readTargets } from "../data/database";
import {
  localDay,
  formatDay,
  moveDay,
  validDay,
  MEALS,
  totals,
  portion,
  numberLabel,
  type Entry,
  type Meal,
  type Targets,
} from "../domain/nutrition";
import { Text } from "../components/Text";
import { DesignIcon } from "../components/DesignIcon";
import { designAssets } from "../components/designAssets";
import { AssetButton, BottomTabs, Message, Page, ui } from "../components/ui";
import { PortionSheet } from "../components/PortionSheet";
import { colors } from "../constants/theme";

const assets = designAssets["3-126"];
export default function NutritionScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ date?: string }>();
  const day = validDay(params.date) ? params.date : localDay();
  const setDay = (date: string) => router.setParams({ date });
  const [entries, setEntries] = useState<Entry[]>([]);
  const [targets, setTargets] = useState<Targets | null>(null);
  const [openMeal, setOpenMeal] = useState<Meal | null>("Breakfast");
  const [editing, setEditing] = useState<Entry | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useFocusEffect(
    useCallback(() => {
      if (editing) return;
      let active = true;
      setLoading(true);
      setError("");
      Promise.all([entriesForDay(db, day), readTargets(db)])
        .then(([items, goals]) => {
          if (active) {
            setEntries(items);
            setTargets(goals);
          }
        })
        .catch(() => {
          if (active)
            setError("Could not load your diary. Please reopen this screen.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [db, day, editing]),
  );
  const total = totals(entries);
  const navigate = (pathname: "/search" | "/scan") =>
    router.push({
      pathname,
      params: { date: day, meal: openMeal ?? "Breakfast" },
    });
  const dateLabel =
    day === localDay()
      ? `Today, ${new Date(`${day}T12:00:00`).toLocaleDateString("en-AU", { month: "short", day: "numeric" })}`
      : formatDay(day);
  return (
    <Page scroll={false}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.heading}>
          <Text accessibilityRole="header" style={s.headingText}>
            Nutrition Diary
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Your settings"
            onPress={() => router.push("/settings")}
            style={s.avatar}
          >
            <DesignIcon asset={assets.imgUserRound} />
          </Pressable>
        </View>
        <View style={s.date}>
          <AssetButton
            asset={assets.imgChevronLeft}
            label="Previous day"
            onPress={() => setDay(moveDay(day, -1))}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${dateLabel}. Return to today`}
            onPress={() => setDay(localDay())}
          >
            <Text style={s.dateText}>{dateLabel}</Text>
          </Pressable>
          <AssetButton
            asset={assets.imgChevronRight}
            label="Next day"
            onPress={() => setDay(moveDay(day, 1))}
          />
        </View>
        <View style={s.summary}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit daily targets"
            onPress={() => router.push("/targets")}
          >
            <Text style={s.eyebrow}>YOUR DAILY FUEL</Text>
            <View style={s.energy}>
              <Text style={s.energyNumber}>{numberLabel(total.calories)}</Text>
              <View>
                {targets ? (
                  <>
                    <Text style={s.energyMeta}>
                      of {numberLabel(targets.calories)} kcal
                    </Text>
                    <Text style={s.energyMeta}>
                      {numberLabel(Math.abs(targets.calories - total.calories))}{" "}
                      {total.calories > targets.calories
                        ? "over target"
                        : "remaining"}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={s.energyMeta}>kcal logged</Text>
                    <Text style={s.energyMeta}>Set your targets →</Text>
                  </>
                )}
              </View>
            </View>
          </Pressable>
          {(["protein", "carbs", "fat"] as const).map((key, index) => (
            <View key={key} style={{ gap: 4 }}>
              <View style={s.macroRow}>
                <Text style={s.macroLabel}>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </Text>
                <Text style={s.macroValue}>
                  {numberLabel(total[key])}
                  {targets ? ` / ${numberLabel(targets[key])}` : ""} g
                </Text>
              </View>
              <View style={s.track}>
                <View
                  style={{
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: [colors.pale, colors.sage, colors.pink][
                      index
                    ],
                    width: `${targets ? Math.min(100, (total[key] / targets[key]) * 100) : 0}%`,
                  }}
                />
              </View>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({ pathname: "/nutrients", params: { date: day } })
            }
            style={{ paddingVertical: 2 }}
          >
            <Text style={s.nutrientsLink}>View all nutrients →</Text>
          </Pressable>
        </View>
        {error ? <Message error>{error}</Message> : null}
        {loading ? (
          <ActivityIndicator color={colors.olive} />
        ) : (
          MEALS.map((meal) => {
            const items = entries.filter((entry) => entry.meal === meal);
            const expanded = openMeal === meal;
            return (
              <View key={meal} style={s.mealCard}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${meal}, ${items.length} foods`}
                  accessibilityState={{ expanded }}
                  onPress={() => setOpenMeal(expanded ? null : meal)}
                  style={s.mealHeader}
                >
                  <View style={s.mealTitle}>
                    <Text style={s.mealName}>{meal}</Text>
                    {expanded ? (
                      <>
                        <View style={ui.dot} />
                        <Text style={s.openText}>Open</Text>
                      </>
                    ) : (
                      <DesignIcon asset={assets.imgChevronDown} />
                    )}
                  </View>
                  <Text style={s.kcal}>
                    {numberLabel(totals(items).calories)} kcal
                  </Text>
                </Pressable>
                {expanded ? (
                  <>
                    <View style={{ overflow: "hidden" }}>
                      <DesignIcon asset={assets.imgLine} />
                    </View>
                    {items.length ? (
                      items.map((entry) => (
                        <View key={entry.id} style={s.foodRow}>
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text style={s.foodName}>{entry.food.name}</Text>
                            <Text style={s.foodMeta}>
                              {numberLabel(entry.grams, 1)} g
                              {entry.food.brand ? ` · ${entry.food.brand}` : ""}
                            </Text>
                          </View>
                          <Text style={s.kcal}>
                            {numberLabel(
                              portion(entry.food, entry.grams).calories,
                            )}{" "}
                            kcal
                          </Text>
                          <AssetButton
                            asset={assets.imgPen}
                            label={`Edit ${entry.food.name}`}
                            onPress={() => setEditing(entry)}
                          />
                        </View>
                      ))
                    ) : (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => navigate("/search")}
                        style={{ paddingVertical: 9 }}
                      >
                        <Text style={s.empty}>
                          Add your first food to {meal.toLowerCase()} →
                        </Text>
                      </Pressable>
                    )}
                  </>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
      <View style={s.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigate("/search")}
          style={[s.action, s.search]}
        >
          <DesignIcon asset={assets.imgSearch} />
          <Text style={s.actionText}>Search Foods</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigate("/scan")}
          style={[s.action, s.scan]}
        >
          <DesignIcon asset={assets.imgScanBarcode} />
          <Text style={[s.actionText, { color: colors.white }]}>
            Scan Barcode
          </Text>
        </Pressable>
      </View>
      <BottomTabs />
      {editing ? (
        <PortionSheet
          food={editing.food}
          day={day}
          initialMeal={editing.meal}
          entry={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </Page>
  );
}
const s = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 20, gap: 12 },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingTop: 12,
  },
  headingText: { fontSize: 24, fontWeight: "700" },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.pink,
    borderWidth: 0.5,
    borderColor: colors.charcoal,
    justifyContent: "center",
    alignItems: "center",
  },
  date: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: -8,
  },
  dateText: { fontSize: 16, fontWeight: "600" },
  summary: {
    backgroundColor: colors.charcoal,
    borderRadius: 22,
    padding: 20,
    gap: 3,
    marginBottom: 0,
  },
  eyebrow: { color: colors.pale, fontSize: 11, fontWeight: "600" },
  energy: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  energyNumber: { fontSize: 32, fontWeight: "700", color: colors.cream },
  energyMeta: { fontSize: 12, fontWeight: "500", color: colors.pale },
  macroRow: { flexDirection: "row", justifyContent: "space-between" },
  macroLabel: { color: colors.cream, fontSize: 12, fontWeight: "500" },
  macroValue: { color: colors.cream, fontSize: 12 },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.muted,
    overflow: "hidden",
  },
  nutrientsLink: { fontSize: 12, fontWeight: "600", color: colors.pale },
  mealCard: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 0.5,
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  mealHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 22,
  },
  mealTitle: { flexDirection: "row", alignItems: "center", gap: 6 },
  mealName: { fontSize: 16, fontWeight: "600" },
  openText: { fontSize: 13, fontWeight: "600", color: colors.green },
  kcal: { fontSize: 14, fontWeight: "600" },
  foodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginRight: -10,
  },
  foodName: { fontSize: 14, fontWeight: "600" },
  foodMeta: { fontSize: 12, color: colors.muted },
  empty: { fontSize: 13, color: colors.green },
  actions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 12,
    backgroundColor: colors.cream,
  },
  action: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 6,
  },
  search: {
    backgroundColor: colors.white,
    borderWidth: 0.5,
    borderColor: colors.line,
  },
  scan: { backgroundColor: colors.charcoal },
  actionText: { fontSize: 14, fontWeight: "600" },
});
