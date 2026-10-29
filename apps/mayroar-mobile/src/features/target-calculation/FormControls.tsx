import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type TextInputProps,
} from "react-native";

import { Text } from "../../components/Text";
import { Field, Message } from "../../components/ui";

export type Choice<T extends string> = {
  value: T;
  label: string;
  description?: string;
};

type ChoiceFieldProps<T extends string> = {
  label: string;
  value: T | null;
  options: readonly Choice<T>[];
  onChange: (value: T) => void;
  error?: string;
  disabled?: boolean;
};

export function ChoiceField<T extends string>({
  label,
  value,
  options,
  onChange,
  error,
  disabled = false,
}: ChoiceFieldProps<T>) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>

      {options.map(option => {
        const selected = value === option.value;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={`${label}: ${option.label}`}
            accessibilityState={{ checked: selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.option,
              selected && styles.selected,
              disabled && styles.disabled,
              pressed && !disabled && styles.pressed,
            ]}
          >
            <Text style={styles.optionLabel}>
              {selected ? "● " : "○ "}
              {option.label}
            </Text>

            {option.description ? (
              <Text style={styles.description}>
                {option.description}
              </Text>
            ) : null}
          </Pressable>
        );
      })}

      {error ? <Message error>{error}</Message> : null}
    </View>
  );
}

type FormFieldProps = Omit<TextInputProps, "value" | "onChangeText"> & {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
};

export function FormField({
  error,
  ...props
}: FormFieldProps) {
  return (
    <View style={styles.group}>
      <Field {...props} />
      {error ? <Message error>{error}</Message> : null}
    </View>
  );
}

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>

      {description ? <Message>{description}</Message> : null}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 20,
  },
  group: {
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
  option: {
    minHeight: 48,
    padding: 14,
    borderWidth: 1,
    borderColor: "#D6D8CF",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    gap: 4,
  },
  selected: {
    borderColor: "#536044",
    backgroundColor: "#EDF0E7",
  },
  optionLabel: {
    fontSize: 16,
    color: "#242820",
  },
  description: {
    fontSize: 14,
    color: "#555C50",
    lineHeight: 20,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.75,
  },
});