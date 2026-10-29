import {
  ChoiceField,
  FormField,
  FormSection,
} from "./FormControls";
import type { QuestionnaireFormProps } from "./formTypes";

type ExerciseDays = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7";

const DAY_OPTIONS: { value: ExerciseDays; label: string }[] = [
  { value: "0", label: "0 days" },
  { value: "1", label: "1 day" },
  { value: "2", label: "2 days" },
  { value: "3", label: "3 days" },
  { value: "4", label: "4 days" },
  { value: "5", label: "5 days" },
  { value: "6", label: "6 days" },
  { value: "7", label: "7 days" },
];

export function ActivityForm({
  value,
  onChange,
  errors = {},
  disabled = false,
}: QuestionnaireFormProps) {
  const selectedDays =
    DAY_OPTIONS.find(
      option => option.value === value.exercise_days_per_week,
    )?.value ?? null;

  const hasExercise =
    selectedDays !== null && selectedDays !== "0";

  function changeDays(days: ExerciseDays) {
    if (days === "0") {
      onChange({
        exercise_days_per_week: "0",
        exercise_minutes_per_session: "0",
        exercise_type: "none",
      });
      return;
    }

    onChange({
      exercise_days_per_week: days,
      exercise_minutes_per_session:
        value.exercise_minutes_per_session === "0"
          ? ""
          : value.exercise_minutes_per_session,
      exercise_type:
        value.exercise_type === "none"
          ? null
          : value.exercise_type,
    });
  }

  return (
    <FormSection
      title="Your usual activity"
      description="Think about a typical week, including work or study and planned exercise."
    >
      <ChoiceField
        label="Activity outside exercise"
        value={value.work_activity}
        options={[
          {
            value: "sitting",
            label: "Mostly sitting",
            description: "Mostly desk work, studying, or sitting.",
          },
          {
            value: "mixed",
            label: "A mix of sitting and moving",
            description: "Some time seated and some time walking.",
          },
          {
            value: "on_feet",
            label: "Mostly on my feet",
            description: "Standing or walking for much of the day.",
          },
          {
            value: "physical",
            label: "Physically demanding work",
            description: "Regular lifting, carrying, or strenuous work.",
          },
        ]}
        onChange={work_activity => onChange({ work_activity })}
        disabled={disabled}
        error={errors.work_activity}
      />

      <ChoiceField
        label="Exercise days per week"
        value={selectedDays}
        options={DAY_OPTIONS}
        onChange={changeDays}
        disabled={disabled}
        error={errors.exercise_days_per_week}
      />

      {hasExercise ? (
        <>
          <FormField
            label="Typical session duration (minutes)"
            value={value.exercise_minutes_per_session}
            onChangeText={exercise_minutes_per_session =>
              onChange({ exercise_minutes_per_session })
            }
            keyboardType="number-pad"
            maxLength={3}
            placeholder="For example, 60"
            editable={!disabled}
            error={errors.exercise_minutes_per_session}
          />

          <ChoiceField
            label="Main exercise type"
            value={value.exercise_type}
            options={[
              {
                value: "resistance",
                label: "Strength or resistance training",
              },
              { value: "cardio", label: "Cardio" },
              { value: "mixed", label: "A mix of strength and cardio" },
            ]}
            onChange={exercise_type => onChange({ exercise_type })}
            disabled={disabled}
            error={errors.exercise_type}
          />
        </>
      ) : null}

      <ChoiceField
        label="Strength-training experience"
        value={value.training_experience}
        options={[
          { value: "beginner", label: "Beginner" },
          { value: "intermediate", label: "Intermediate" },
          { value: "advanced", label: "Advanced" },
          {
            value: "detrained",
            label: "Returning after a break",
          },
        ]}
        onChange={training_experience =>
          onChange({ training_experience })
        }
        disabled={disabled}
        error={errors.training_experience}
      />
    </FormSection>
  );
}