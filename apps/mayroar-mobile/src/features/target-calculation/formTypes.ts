import type { TargetCalculationInputs } from "./types";

export type TargetCalculationForm = {
  age: string;
  gender: TargetCalculationInputs["gender"];
  equation_sex: TargetCalculationInputs["equation_sex"] | null;

  height_cm: string;
  weight_kg: string;

  work_activity: TargetCalculationInputs["work_activity"] | null;
  exercise_days_per_week: string;
  exercise_minutes_per_session: string;
  exercise_type: TargetCalculationInputs["exercise_type"] | null;
  training_experience:
    | TargetCalculationInputs["training_experience"]
    | null;

  body_fat_percent: string;
  body_fat_source: TargetCalculationInputs["body_fat_source"];
  body_fat_measured_on: string;

  calculation_context:
    | TargetCalculationInputs["calculation_context"]
    | null;
};

export type FormErrors = Partial<
  Record<keyof TargetCalculationForm, string>
>;

export type QuestionnaireFormProps = {
  value: TargetCalculationForm;
  onChange: (changes: Partial<TargetCalculationForm>) => void;
  errors?: FormErrors;
  disabled?: boolean;
};

export function createEmptyForm(): TargetCalculationForm {
  return {
    age: "",
    gender: null,
    equation_sex: null,
    height_cm: "",
    weight_kg: "",
    work_activity: null,
    exercise_days_per_week: "",
    exercise_minutes_per_session: "",
    exercise_type: null,
    training_experience: null,
    body_fat_percent: "",
    body_fat_source: null,
    body_fat_measured_on: "",
    calculation_context: null,
  };
}