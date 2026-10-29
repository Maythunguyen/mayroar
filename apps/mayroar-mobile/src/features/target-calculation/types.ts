import type { Targets } from "../../domain/nutrition";

export type GoalName =
  | "lose_fat"
  | "maintain"
  | "build_muscle";

export type TrainingExperience =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "detrained";

export type TargetCalculationInputs = {
  age: number;

  gender: "woman" | "man" | "non_binary" | null;
  equation_sex: "female" | "male";

  height_cm: number;
  weight_kg: number;

  work_activity: "sitting" | "mixed" | "on_feet" | "physical";

  exercise_days_per_week: number;
  exercise_minutes_per_session: number;
  exercise_type: "none" | "resistance" | "cardio" | "mixed";

  training_experience: TrainingExperience;

  body_fat_percent: number | null;
  body_fat_source:
    | "bia"
    | "dxa"
    | "calipers"
    | "other"
    | "visual"
    | null;

  // Date-only API value, for example "2026-10-28".
  body_fat_measured_on: string | null;

  calculation_context:
    | "standard"
    | "pregnant"
    | "breastfeeding"
    | "professional_guidance";
};

export type BodyMeasurements = Pick<
  TargetCalculationInputs,
  "age" | "height_cm" | "weight_kg" | "body_fat_percent"
>;

export type CalculationAssessment = {
  id: string;
  revision: number;
  goal: {
    suggested_goal: GoalName | null;
    recommendation_reason: string;
    selected_goal: GoalName | null;
  };
  plan: {
    targets: Targets;
    assumptions: string[];
  } | null;
}