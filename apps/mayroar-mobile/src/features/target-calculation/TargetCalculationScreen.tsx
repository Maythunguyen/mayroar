import { useRef, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { randomUUID } from "expo-crypto";

import {
  Header,
  Page,
  Button,
  Message,
  ui,
} from "../../components/ui";
import { Text } from "../../components/Text";
import { numberLabel } from "../../domain/nutrition";

import { CalculationContextForm } from "./CalculationContextForm";
import { BodyMeasurementsForm } from "./BodyMeasurementsForm";
import { ActivityForm } from "./ActivityForm";
import { BodyFatForm } from "./BodyFatForm";
import { GoalSelector } from "./GoalSelector";

import {
  calculateTargets,
  updateCalculationGoal,
  confirmCalculation,
} from "./api";

import {
  createEmptyForm,
  type FormErrors,
  type TargetCalculationForm,
} from "./formTypes";

import { validateInputs } from "./validation";

import type {
  GoalName,
  TargetCalculationInputs,
  CalculationAssessment,
} from "./types";

type Action = "calculating" | "saving" | null;

type PendingCalculation = {
  payload: string;
  requestId: string;
};

type PendingConfirmation = {
  calculationId: string;
  revision: number;
  requestId: string;
};

function readNumber(value: string): number {
  const trimmed = value.trim();
  return trimmed === "" ? Number.NaN : Number(trimmed);
}

export default function TargetCalculationScreen() {
  const [form, setForm] = useState<TargetCalculationForm>(
    createEmptyForm,
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [action, setAction] = useState<Action>(null);

  const [calculation, setCalculation] =
    useState<CalculationAssessment | null>(null);

  const [selectedGoal, setSelectedGoal] =
    useState<GoalName | null>(null);

  const submitLock = useRef(false);

  const pendingRequest =
    useRef<PendingCalculation | null>(null);

  const pendingConfirmation =
    useRef<PendingConfirmation | null>(null);

  const busy = action !== null;

  function updateForm(
    changes: Partial<TargetCalculationForm>,
  ) {
    if (submitLock.current) return;

    setForm(current => ({
      ...current,
      ...changes,
    }));

    // An old preview no longer represents the edited answers.
    setCalculation(null);
    setErrors({});
    setSubmitError("");
  }

  function updateGoal(goal: GoalName) {
    if (submitLock.current) return;

    setSelectedGoal(goal);
    setCalculation(null);
    setSubmitError("");
  }

  async function handleSubmit() {
    if (submitLock.current) return;

    setSubmitError("");

    const requiredErrors: FormErrors = {};

    if (!form.equation_sex) {
      requiredErrors.equation_sex =
        "Choose a calculation equation.";
    }

    if (!form.work_activity) {
      requiredErrors.work_activity =
        "Choose your activity at work.";
    }

    if (!form.exercise_type) {
      requiredErrors.exercise_type =
        "Choose your exercise type.";
    }

    if (!form.training_experience) {
      requiredErrors.training_experience =
        "Choose your training experience.";
    }

    if (!form.calculation_context) {
      requiredErrors.calculation_context =
        "Choose your calculation context.";
    }

    setErrors(requiredErrors);

    if (
      !form.equation_sex ||
      !form.work_activity ||
      !form.exercise_type ||
      !form.training_experience ||
      !form.calculation_context
    ) {
      setSubmitError(
        "Please complete the required questions above.",
      );
      return;
    }

    const bodyFatText = form.body_fat_percent.trim();

    const inputs: TargetCalculationInputs = {
      age: readNumber(form.age),
      gender: form.gender,
      equation_sex: form.equation_sex,

      height_cm: readNumber(form.height_cm),
      weight_kg: readNumber(form.weight_kg),

      work_activity: form.work_activity,
      exercise_days_per_week: readNumber(
        form.exercise_days_per_week,
      ),
      exercise_minutes_per_session: readNumber(
        form.exercise_minutes_per_session,
      ),
      exercise_type: form.exercise_type,
      training_experience: form.training_experience,

      body_fat_percent:
        bodyFatText === "" ? null : readNumber(bodyFatText),

      body_fat_source:
        bodyFatText === "" ? null : form.body_fat_source,

      body_fat_measured_on:
        bodyFatText === ""
          ? null
          : form.body_fat_measured_on.trim() || null,

      calculation_context: form.calculation_context,
    };

    const validationErrors = validateInputs(inputs);

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setSubmitError(
        "Please check the highlighted answers above.",
      );
      return;
    }

    if (!selectedGoal) {
      setSubmitError("Choose your goal before calculating.");
      return;
    }

    submitLock.current = true;
    setAction("calculating");
    setCalculation(null);

    try {
      const payload = JSON.stringify(inputs);

      let request = pendingRequest.current;

      if (!request || request.payload !== payload) {
        request = {
          payload,
          requestId: randomUUID(),
        };

        pendingRequest.current = request;
      }

      // Save answers and obtain the assessment.
      const assessment = await calculateTargets(
        inputs,
        request.requestId,
      );

      // Calculate the plan using the user's chosen goal.
      const result = await updateCalculationGoal(
        assessment.id,
        assessment.revision,
        selectedGoal,
      );

      if (!result.plan) {
        throw new Error(
          "The server did not return a nutrition plan. Please try again.",
        );
      }

      setCalculation(result);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Could not calculate your targets. Please try again.",
      );
    } finally {
      submitLock.current = false;
      setAction(null);
    }
  }

  async function handleSaveTargets() {
    if (submitLock.current || !calculation?.plan) return;

    const assessment = calculation;

    submitLock.current = true;
    setAction("saving");
    setSubmitError("");

    try {
      let confirmation = pendingConfirmation.current;

      if (
        !confirmation ||
        confirmation.calculationId !== assessment.id ||
        confirmation.revision !== assessment.revision
      ) {
        confirmation = {
          calculationId: assessment.id,
          revision: assessment.revision,
          requestId: randomUUID(),
        };

        pendingConfirmation.current = confirmation;
      }

      // Retry the same confirmation with the same request ID.
      await confirmCalculation(
        assessment.id,
        assessment.revision,
        confirmation.requestId,
      );

      // The diary reloads its saved targets when it gains focus.
      router.replace("/");
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Could not save your targets. Please try again.",
      );
    } finally {
      submitLock.current = false;
      setAction(null);
    }
  }

  return (
    <Page>
      <Header title="Set your nutrition targets" />

      <View style={{ gap: 32 }}>
        <CalculationContextForm
          value={form}
          onChange={updateForm}
          errors={errors}
          disabled={busy}
          onManualTargets={() => {
            if (!submitLock.current) {
              router.push("/targets");
            }
          }}
          onTrackWithoutTargets={() => {
            if (!submitLock.current) {
              router.replace("/");
            }
          }}
        />

        <BodyMeasurementsForm
          value={form}
          onChange={updateForm}
          errors={errors}
          disabled={busy}
        />

        <ActivityForm
          value={form}
          onChange={updateForm}
          errors={errors}
          disabled={busy}
        />

        <BodyFatForm
          value={form}
          onChange={updateForm}
          errors={errors}
          disabled={busy}
        />

        <GoalSelector
          suggestedGoal={
            calculation?.goal.suggested_goal ?? null
          }
          recommendationReason={
            calculation?.goal.recommendation_reason ?? ""
          }
          selectedGoal={selectedGoal}
          onChange={updateGoal}
          disabled={busy}
        />

        <Button
          busy={action === "calculating"}
          disabled={!selectedGoal || busy}
          onPress={() => void handleSubmit()}
        >
          Calculate my targets
        </Button>

        {calculation?.plan ? (
          <View style={[ui.card, { gap: 16 }]}>
            <Text style={ui.label}>
              YOUR CALCULATED DAILY TARGETS
            </Text>

            <Text style={ui.body}>
              Calories:{" "}
              {numberLabel(calculation.plan.targets.calories)} kcal
            </Text>

            <Text style={ui.body}>
              Protein:{" "}
              {numberLabel(calculation.plan.targets.protein, 1)} g
            </Text>

            <Text style={ui.body}>
              Carbs:{" "}
              {numberLabel(calculation.plan.targets.carbs, 1)} g
            </Text>

            <Text style={ui.body}>
              Fat:{" "}
              {numberLabel(calculation.plan.targets.fat, 1)} g
            </Text>

            <Message>
              Review these estimated starting targets. Your diary
              will use them after you press Save & Apply Targets.
            </Message>

            {calculation.plan.assumptions.map(
              (assumption, index) => (
                <Message key={index}>{assumption}</Message>
              ),
            )}

            <Button
              busy={action === "saving"}
              disabled={busy}
              onPress={() => void handleSaveTargets()}
            >
              Save & Apply Targets
            </Button>
          </View>
        ) : null}

        {submitError ? (
          <Message error>{submitError}</Message>
        ) : null}
      </View>
    </Page>
  );
}