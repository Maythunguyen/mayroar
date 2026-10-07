import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, fonts } from "../theme";
import { MEALS, type Meal } from "../domain/nutrition";
import { Text } from "./Text";
import { DesignIcon, type DesignAsset } from "./DesignIcon";
import { designAssets } from "./designAssets";

export function Page({
  children,
  scroll = true,
}: {
  children: ReactNode;
  scroll?: boolean;
}) {
  return (
    <SafeAreaView
      edges={["top"]}
      style={[ui.page, Platform.OS === "web" && { paddingTop: 20 }]}
    >
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={ui.pageContent}
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </SafeAreaView>
  );
}

export function Header({
  title,
  asset = designAssets["3-244"].imgChevronLeft,
  onBack,
  right,
}: {
  title: string;
  asset?: DesignAsset;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <View style={ui.header}>
      <AssetButton
        asset={asset}
        label="Back"
        onPress={
          onBack ??
          (() => (router.canGoBack() ? router.back() : router.replace("/")))
        }
      />
      <Text style={ui.title}>{title}</Text>
      {right ?? <View style={{ width: 44 }} />}
    </View>
  );
}

export function AssetButton({
  asset,
  label,
  onPress,
  disabled = false,
}: {
  asset: DesignAsset;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        ui.iconButton,
        pressed && ui.pressed,
        disabled && ui.disabled,
      ]}
    >
      <DesignIcon asset={asset} />
    </Pressable>
  );
}

export function Button({
  children,
  onPress,
  disabled = false,
  busy = false,
  secondary = false,
}: {
  children: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        ui.button,
        secondary && ui.secondary,
        (disabled || busy) && ui.disabled,
        pressed && ui.pressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? colors.charcoal : colors.cream} />
      ) : (
        <Text style={[ui.buttonText, secondary && { color: colors.charcoal }]}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  style,
  ...props
}: TextInputProps & { label: string }) {
  return (
    <View style={ui.field}>
      <Text style={ui.label}>{label.toUpperCase()}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[ui.input, style]}
        {...props}
      />
    </View>
  );
}

export function MealPicker({
  value,
  onChange,
}: {
  value: Meal;
  onChange: (value: Meal) => void;
}) {
  return (
    <View style={ui.meals}>
      {MEALS.map((meal) => (
        <Pressable
          key={meal}
          accessibilityRole="button"
          accessibilityState={{ selected: meal === value }}
          onPress={() => onChange(meal)}
          style={[ui.chip, meal === value && ui.chipActive]}
        >
          <Text
            style={[ui.chipText, meal === value && { color: colors.green }]}
          >
            {meal}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Message({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <Text
      accessibilityRole={error ? "alert" : undefined}
      style={[ui.message, error && { color: colors.error }]}
    >
      {children}
    </Text>
  );
}

export function BottomTabs({
  screen = "3-126",
}: {
  screen?: "3-126" | "3-244" | "3-322" | "3-433" | "3-486" | "3-578";
}) {
  const icons = designAssets[screen];
  const tabs = [
    ["Home", icons.imgHouse],
    ["Nutrition", icons.imgApple],
    ["Workout", icons.imgDumbbell],
    ["Insights", icons.imgChartLine],
    [
      "Progress",
      screen === "3-578"
        ? designAssets["3-578"].imgCalendarCheck1
        : icons.imgCalendarCheck,
    ],
  ] as const;
  return (
    <SafeAreaView edges={["bottom"]} style={ui.tabArea}>
      <View style={ui.tabs}>
        {tabs.map(([name, asset]) => (
          <Pressable
            key={name}
            accessibilityRole="tab"
            accessibilityLabel={
              name === "Nutrition" ? name : `${name}, coming later`
            }
            accessibilityState={{
              selected: name === "Nutrition",
              disabled: name !== "Nutrition",
            }}
            disabled={name !== "Nutrition"}
            onPress={() => router.dismissTo("/")}
            style={ui.tab}
          >
            <DesignIcon asset={asset} />
            <Text
              style={[
                ui.tabLabel,
                name === "Nutrition" && {
                  color: colors.green,
                  fontWeight: "600",
                },
              ]}
            >
              {name}
            </Text>
            {name === "Nutrition" ? <View style={ui.dot} /> : null}
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

export const ui = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  pageContent: { padding: 16, gap: 20, paddingBottom: 32 },
  header: { flexDirection: "row", alignItems: "center", minHeight: 56 },
  title: { flex: 1, fontSize: 16, fontWeight: "600", textAlign: "center" },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 22,
  },
  button: {
    minHeight: 50,
    padding: 14,
    backgroundColor: colors.charcoal,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondary: {
    backgroundColor: colors.white,
    borderWidth: 0.5,
    borderColor: colors.line,
  },
  buttonText: { color: colors.cream, fontSize: 14, fontWeight: "600" },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.45 },
  field: { gap: 8, flexShrink: 1 },
  label: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  input: {
    backgroundColor: colors.white,
    borderWidth: 0.5,
    borderColor: colors.line,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    minHeight: 43,
    color: colors.charcoal,
    fontFamily: fonts.regular,
  },
  message: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  card: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: colors.line,
    gap: 14,
  },
  body: { fontSize: 14, lineHeight: 19, color: colors.charcoal },
  subheading: { fontSize: 18, fontWeight: "600", color: colors.charcoal },
  meals: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    minHeight: 36,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 0.5,
    borderColor: colors.line,
  },
  chipActive: { backgroundColor: colors.pink, borderColor: colors.olive },
  chipText: { fontSize: 12, fontWeight: "600" },
  tabArea: { backgroundColor: colors.white },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 12,
    minHeight: 70,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 4,
  },
  tabLabel: { fontSize: 10, fontWeight: "500", color: colors.muted },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.olive },
  fixedAction: { backgroundColor: colors.white, padding: 16, paddingTop: 12 },
});
