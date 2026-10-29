import { Message } from "../../components/ui";
import { ChoiceField, FormSection } from "./FormControls";
import type { GoalName } from "./types";

export const GOAL_LABELS: Record<GoalName, string> = {
  lose_fat: "Lose fat",
  maintain: "Maintain weight",
  build_muscle: "Build muscle",
};

type Props = {
  suggestedGoal: GoalName | null;
  recommendationReason: string;
  selectedGoal: GoalName | null;
  onChange: (goal: GoalName) => void;
  disabled?: boolean;
  error?: string;
};

export function GoalSelector({
  suggestedGoal,
  recommendationReason,
  selectedGoal,
  onChange,
  disabled = false,
  error,
}: Props) {
  return (
    <FormSection title="Choose your goal">
      <Message>
        {suggestedGoal
          ? `Suggested starting goal: ${GOAL_LABELS[suggestedGoal]}.`
          : "Choose the goal you want to work towards."}
      </Message>

      {recommendationReason ? (
        <Message>{recommendationReason}</Message>
      ) : null}

      <ChoiceField
        label="My goal"
        value={selectedGoal}
        options={[
          { value: "lose_fat", label: GOAL_LABELS.lose_fat },
          { value: "maintain", label: GOAL_LABELS.maintain },
          { value: "build_muscle", label: GOAL_LABELS.build_muscle },
        ]}
        onChange={onChange}
        disabled={disabled}
        error={error}
      />

      <Message>
        You can choose a different goal from the suggestion and adjust
        your goals later.
      </Message>
    </FormSection>
  );
}