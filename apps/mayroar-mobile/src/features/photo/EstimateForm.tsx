import { View } from "react-native";
import { Button, Field, Message, ui } from "../../components/ui";
import type { Meal } from "../../domain/nutrition";
import { FIELDS, type Draft } from "./model";

type Props = {
  draft: Draft;
  meal: Meal;
  disabled: boolean;
  saving: boolean;
  onChange: (draft: Draft) => void;
  onSave: () => void;
};

export function EstimateForm({ draft, meal, disabled, saving, onChange, onSave }: Props) {
  return <View style={ui.card}>
    <Message>Approximate values for the whole pictured portion. Review the ingredients, weight and nutrition before saving.</Message>
    <Message>{draft.assumptions}</Message>
    <Field label="Meal description" value={draft.name} maxLength={120} editable={!disabled}
      onChangeText={name => onChange({ ...draft, name })} />
    {FIELDS.map(key => <Field key={key}
      label={key === "grams" ? "Estimated portion weight (g)" : `${key} (${key === "calories" ? "kcal" : "g"}) — whole portion`}
      value={draft.values[key]} editable={!disabled} keyboardType="decimal-pad"
      onChangeText={value => onChange({ ...draft, values: { ...draft.values, [key]: value } })} />)}
    <Button busy={saving} disabled={disabled} onPress={onSave}>{`Confirm and add to ${meal}`}</Button>
  </View>;
}
