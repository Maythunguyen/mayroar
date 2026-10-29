import { Message } from "../../components/ui";
import {
  ChoiceField,
  FormField,
  FormSection,
} from "./FormControls";
import type { QuestionnaireFormProps } from "./formTypes";

export function BodyMeasurementsForm({
  value,
  onChange,
  errors = {},
  disabled = false,
}: QuestionnaireFormProps) {
  return (
    <FormSection
      title="About your body"
      description="Use your current measurements. Height is in centimetres and weight is in kilograms."
    >
      <FormField
        label="Age"
        value={value.age}
        onChangeText={age => onChange({ age })}
        keyboardType="number-pad"
        maxLength={3}
        placeholder="For example, 30"
        editable={!disabled}
        error={errors.age}
      />

      <ChoiceField
        label="Gender identity (optional)"
        value={value.gender ?? "prefer_not_to_say"}
        options={[
          { value: "woman", label: "Woman" },
          { value: "man", label: "Man" },
          { value: "non_binary", label: "Non-binary" },
          {
            value: "prefer_not_to_say",
            label: "Prefer not to say",
          },
        ]}
        onChange={gender =>
          onChange({
            gender: gender === "prefer_not_to_say" ? null : gender,
          })
        }
        disabled={disabled}
        error={errors.gender}
      />

      <Message>
        The resting-energy equation used here has female and male
        coefficients. This choice is separate from gender identity.
        If you’re unsure which is appropriate, you can use manual targets.
      </Message>

      <ChoiceField
        label="Coefficient for the resting-energy equation"
        value={value.equation_sex}
        options={[
          { value: "female", label: "Female coefficient" },
          { value: "male", label: "Male coefficient" },
        ]}
        onChange={equation_sex => onChange({ equation_sex })}
        disabled={disabled}
        error={errors.equation_sex}
      />

      <FormField
        label="Height (cm)"
        value={value.height_cm}
        onChangeText={height_cm => onChange({ height_cm })}
        keyboardType="decimal-pad"
        maxLength={7}
        placeholder="For example, 160"
        editable={!disabled}
        error={errors.height_cm}
      />

      <FormField
        label="Weight (kg)"
        value={value.weight_kg}
        onChangeText={weight_kg => onChange({ weight_kg })}
        keyboardType="decimal-pad"
        maxLength={7}
        placeholder="For example, 60"
        editable={!disabled}
        error={errors.weight_kg}
      />
    </FormSection>
  );
}
