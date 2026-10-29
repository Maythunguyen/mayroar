import { Button, Message } from "../../components/ui";
import { ChoiceField, FormSection } from "./FormControls";
import type { QuestionnaireFormProps } from "./formTypes";

type Props = QuestionnaireFormProps & {
  onManualTargets: () => void;
  onTrackWithoutTargets: () => void;
};

export function CalculationContextForm({
  value,
  onChange,
  errors = {},
  disabled = false,
  onManualTargets,
  onTrackWithoutTargets,
}: Props) {
  const unsupported =
    value.calculation_context !== null &&
    value.calculation_context !== "standard";

  return (
    <FormSection
      title="Before we estimate"
      description="This calculator currently supports adults aged 18–100. You can also enter your own targets or track without targets."
    >
      <ChoiceField
        label="Which applies to you?"
        value={value.calculation_context}
        options={[
          {
            value: "standard",
            label: "None of the situations below",
          },
          {
            value: "pregnant",
            label: "I’m pregnant",
          },
          {
            value: "breastfeeding",
            label: "I’m breastfeeding",
          },
          {
            value: "professional_guidance",
            label: "I need an individually guided nutrition plan",
          },
        ]}
        onChange={calculation_context =>
          onChange({ calculation_context })
        }
        error={errors.calculation_context}
        disabled={disabled}
      />

      {unsupported ? (
        <Message>
          Assisted calculation does not currently support this situation.
          You can enter targets agreed with your health professional,
          or continue tracking without targets.
        </Message>
      ) : null}

      <Button
        secondary
        disabled={disabled}
        onPress={onManualTargets}
      >
        Enter targets manually
      </Button>

      <Button
        secondary
        disabled={disabled}
        onPress={onTrackWithoutTargets}
      >
        Track without targets
      </Button>
    </FormSection>
  );
}