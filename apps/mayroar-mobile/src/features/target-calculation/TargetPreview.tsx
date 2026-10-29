import { StyleSheet, View } from "react-native";

import { Text } from "../../components/Text";
import { Button, Message } from "../../components/ui";
import type { Targets } from "../../domain/nutrition";
import type { GoalName } from "./types";
import { GOAL_LABELS } from "./GoalSelector";
import { FormSection } from "./FormControls";

type Props = {
  targets: Targets;
  selectedGoal: GoalName;
  assumptions: string[];
  saving?: boolean;
  disabled?: boolean;
  error?: string;
  onConfirm: () => void;
  onChangeGoal: () => void;
};

const TARGET_FIELDS = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
] as const;

export function TargetPreview({
  targets,
  selectedGoal,
  assumptions,
  saving = false,
  disabled = false,
  error,
  onConfirm,
  onChangeGoal,
}: Props) {
  return (
    <FormSection
      title="Review your daily targets"
      description={`Selected goal: ${GOAL_LABELS[selectedGoal]}`}
    >
      <View style={styles.card}>
        {TARGET_FIELDS.map(({ key, label, unit }) => (
          <View key={key} style={styles.row}>
            <Text>{label}</Text>
            <Text style={styles.value}>
              {targets[key].toLocaleString(undefined, {
                maximumFractionDigits: key === "calories" ? 0 : 1,
              })}{" "}
              {unit}
            </Text>
          </View>
        ))}
      </View>

      {assumptions.map((assumption, index) => (
        <Message key={`${index}-${assumption}`}>
          {assumption}
        </Message>
      ))}

      <Message>
        These are estimated starting targets. Your diary targets will
        change only after you confirm and the save succeeds.
      </Message>

      {error ? <Message error>{error}</Message> : null}

      <Button
        busy={saving}
        disabled={disabled}
        onPress={onConfirm}
      >
        Confirm and save targets
      </Button>

      <Button
        secondary
        disabled={disabled || saving}
        onPress={onChangeGoal}
      >
        Change my goal
      </Button>
    </FormSection>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#D6D8CF",
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  value: {
    fontWeight: "600",
  },
});