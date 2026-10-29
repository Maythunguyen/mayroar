import { Button, Message } from "../../components/ui";
import {
  ChoiceField,
  FormField,
  FormSection,
} from "./FormControls";
import type { QuestionnaireFormProps } from "./formTypes";

export function BodyFatForm({
  value,
  onChange,
  errors = {},
  disabled = false,
}: QuestionnaireFormProps) {
  function clearEstimate() {
    onChange({
      body_fat_percent: "",
      body_fat_source: null,
      body_fat_measured_on: "",
    });
  }

  return (
    <FormSection
      title="Body-fat estimate"
      description="Optional. If you don’t know, leave this blank. The backend can use its alternative protein calculation."
    >
      <FormField
        label="Body fat (%)"
        value={value.body_fat_percent}
        onChangeText={body_fat_percent =>
          onChange({ body_fat_percent })
        }
        keyboardType="decimal-pad"
        maxLength={6}
        placeholder="For example, 25"
        editable={!disabled}
        error={errors.body_fat_percent}
      />

      <ChoiceField
        label="Where did the estimate come from?"
        value={value.body_fat_source}
        options={[
          { value: "bia", label: "BIA scale or scan" },
          { value: "dxa", label: "DXA scan" },
          { value: "calipers", label: "Skinfold calipers" },
          { value: "other", label: "Another method" },
          { value: "visual", label: "Visual estimate" },
        ]}
        onChange={body_fat_source => onChange({ body_fat_source })}
        disabled={disabled}
        error={errors.body_fat_source}
      />

      {value.body_fat_source === "visual" ? (
        <Message>
          The current calculator does not use visual estimates for
          lean-mass calculations or body-fat-based goal recommendations.
        </Message>
      ) : null}

      <FormField
        label="Measurement date (optional, YYYY-MM-DD)"
        value={value.body_fat_measured_on}
        onChangeText={body_fat_measured_on =>
          onChange({ body_fat_measured_on })
        }
        placeholder="2026-10-28"
        maxLength={10}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!disabled}
        error={errors.body_fat_measured_on}
      />

      <Button
        secondary
        disabled={disabled}
        onPress={clearEstimate}
      >
        Clear estimate / I don’t know
      </Button>
    </FormSection>
  );
}