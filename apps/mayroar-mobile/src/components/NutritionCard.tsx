import { View, StyleSheet } from "react-native";
import { Text } from "./Text";
import { numberLabel, type Nutrients } from "../domain/nutrition";
import { colors } from "../theme";
import { ui } from "./ui";
import { DesignIcon, type DesignAsset } from "./DesignIcon";

export function NutritionCard({
  values,
  label = "NUTRITION PREVIEW",
  divider,
}: {
  values: Nutrients;
  label?: string;
  divider?: DesignAsset;
}) {
  return (
    <View style={ui.card}>
      <View style={s.energy}>
        <Text style={ui.label}>{label}</Text>
        <Text style={s.value}>
          {numberLabel(values.calories)} <Text style={s.unit}>kcal</Text>
        </Text>
      </View>
      {divider ? (
        <View style={{ overflow: "hidden" }}>
          <DesignIcon asset={divider} />
        </View>
      ) : null}
      <View style={s.macros}>
        {(["protein", "carbs", "fat"] as const).map((key) => (
          <View key={key} style={s.macro}>
            <Text style={s.macroLabel}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </Text>
            <Text style={s.macroValue}>{numberLabel(values[key], 1)} g</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  energy: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  value: { fontSize: 24, fontWeight: "700", color: colors.green },
  unit: { fontSize: 14, color: colors.muted },
  macros: { flexDirection: "row", gap: 12 },
  macro: {
    flex: 1,
    alignItems: "flex-start",
    backgroundColor: colors.cream,
    borderRadius: 8,
    padding: 8,
    gap: 4,
  },
  macroValue: { fontSize: 14, fontWeight: "600" },
  macroLabel: { fontSize: 11, color: colors.muted, fontWeight: "600" },
});
