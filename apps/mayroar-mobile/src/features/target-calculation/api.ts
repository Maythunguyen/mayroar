import { api } from "../../data/apiClient";
import type {
  TargetCalculationInputs,
  CalculationAssessment,
  GoalName,
} from "./types";

export async function calculateTargets(
  inputs: TargetCalculationInputs,
  requestId: string,
): Promise<CalculationAssessment> {
  return api.request<CalculationAssessment>(
    "/target_calculation",
    {
      method: "POST",
      body: JSON.stringify({
        request_id: requestId,
        inputs,
      }),
    },
  );
}

export async function updateCalculationGoal(
  calculationId: string,
  expectedRevision: number,
  selectedGoal: GoalName,
): Promise<CalculationAssessment> {
  return api.request<CalculationAssessment>(
    `/target_calculation/${encodeURIComponent(calculationId)}/goal`,
    {
      method: "PATCH",
      body: JSON.stringify({
        expected_revision: expectedRevision,
        selected_goal: selectedGoal,
        options: {},
      }),
    },
  );
}

export async function confirmCalculation(
  calculationId: string,
  expectedRevision: number,
  requestId: string,
): Promise<void> {
  await api.request(
    `/target_calculation/${encodeURIComponent(calculationId)}/confirm`,
    {
      method: "POST",
      body: JSON.stringify({
        request_id: requestId,
        expected_revision: expectedRevision,
      }),
    },
  );
}