import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { entriesForDay, readTargets } from "../data/database";
import {
  formatDay,
  localDay,
  numberLabel,
  totals,
  validDay,
  type Entry,
  type Targets,
} from "../domain/nutrition";
import { BottomTabs, Header, Message, Page, ui } from "../components/ui";
import { Text } from "../components/Text";
import { DesignIcon } from "../components/DesignIcon";
import { designAssets } from "../components/designAssets";
import { colors } from "../constants/theme";

const assets = designAssets["3-578"];
export default function NutrientsScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ date?: string }>();
  const day = validDay(params.date) ? params.date : localDay();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [targets, setTargets] = useState<Targets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([entriesForDay(db, day), readTargets(db)])
      .then(([items, goals]) => {
        if (active) {
          setEntries(items);
          setTargets(goals);
        }
      })
      .catch(() => {
        if (active) setError("Could not load nutrient details.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [db, day]);
  const total = totals(entries);
  const rows = (["calories", "protein", "carbs", "fat"] as const).map(
    (key) => ({
      key,
      label:
        key === "calories"
          ? "Energy"
          : key.charAt(0).toUpperCase() + key.slice(1),
      value: total[key],
      target: targets?.[key],
      unit: key === "calories" ? "kcal" : "g",
      missing: 0,
    }),
  );
  const extraRows = (["fibre", "sugars"] as const).map((key) => ({
    key,
    label: key === "fibre" ? "Dietary fibre" : "Sugars",
    value: entries.reduce(
      (sum, entry) =>
        sum + ((entry.food.extra?.[key] ?? 0) * entry.grams) / 100,
      0,
    ),
    target: undefined,
    unit: "g",
    missing: entries.filter((entry) => entry.food.extra?.[key] == null).length,
  }));
  const incomplete = extraRows.some((row) => row.missing > 0);
  return (
    <Page scroll={false}>
      <View style={{ paddingHorizontal: 16 }}>
        <Header
          title="Nutrient Details"
          asset={assets.imgChevronLeft}
          right={
            <View style={ui.iconButton}>
              <DesignIcon asset={assets.imgCalendarCheck} />
            </View>
          }
        />
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.day}>{formatDay(day)}</Text>
        {loading ? (
          <ActivityIndicator color={colors.olive} />
        ) : (
          <>
            {incomplete ? (
              <View style={s.notice}>
                <DesignIcon asset={assets.imgAlertTriangle} />
                <Text style={s.noticeText}>
                  Some foods are missing fibre or sugar data. Partial totals
                  below include only known values.
                </Text>
              </View>
            ) : null}
            <Text style={ui.label}>NUTRIENT BREAKDOWN</Text>
            {[...rows, ...extraRows].map((row) => (
              <View key={row.key} style={s.card}>
                <View style={s.row}>
                  <Text style={s.label}>{row.label}</Text>
                  <Text style={s.amount}>
                    {row.missing === entries.length && row.missing > 0
                      ? "Not available"
                      : `${numberLabel(row.value, row.unit === "g" ? 1 : 0)}${row.target ? ` / ${numberLabel(row.target)}` : ""} ${row.unit}`}
                  </Text>
                </View>
                {row.target ? (
                  <View style={s.track}>
                    <View
                      style={{
                        height: 5,
                        width: `${Math.min(100, (row.value / row.target) * 100)}%`,
                        backgroundColor: colors.olive,
                        borderRadius: 3,
                      }}
                    />
                  </View>
                ) : null}
                <Message>
                  {row.missing
                    ? `${entries.length - row.missing} of ${entries.length} foods have this value`
                    : entries.length
                      ? "All logged foods included"
                      : "No foods logged for this day"}
                </Message>
              </View>
            ))}
            <Message>
              Vitamin and mineral totals will be added when those nutrient
              fields are connected. Unknown values are not treated as zero.
            </Message>
          </>
        )}
        {error ? <Message error>{error}</Message> : null}
      </ScrollView>
      <BottomTabs />
    </Page>
  );
}
const s = StyleSheet.create({
  content: { padding: 16, gap: 14, paddingBottom: 30 },
  day: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    marginBottom: 8,
  },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.pink,
    padding: 14,
    borderRadius: 14,
  },
  noticeText: { flex: 1, fontSize: 12 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.line,
    padding: 16,
    gap: 10,
  },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  label: { fontSize: 14, fontWeight: "600" },
  amount: { fontSize: 12, fontWeight: "500", color: colors.green },
  track: {
    height: 5,
    backgroundColor: colors.line,
    borderRadius: 3,
    overflow: "hidden",
  },
});
