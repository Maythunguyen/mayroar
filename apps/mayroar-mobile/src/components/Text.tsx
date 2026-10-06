import { Text as NativeText, StyleSheet, type TextProps } from "react-native";
import { colors, fonts } from "../constants/theme";

// React Native does not inherit a page font like CSS. This wrapper applies Geist.
export function Text({ style, ...props }: TextProps) {
  const flat = StyleSheet.flatten(style) ?? {};
  const weight =
    flat.fontWeight === "bold" ? 700 : Number(flat.fontWeight ?? 400);
  const family =
    weight >= 700
      ? fonts.bold
      : weight >= 600
        ? fonts.semibold
        : weight >= 500
          ? fonts.medium
          : fonts.regular;
  return (
    <NativeText
      {...props}
      style={[
        {
          fontFamily: family,
          color: colors.charcoal,
          lineHeight: (flat.fontSize ?? 14) * 1.35,
        },
        style,
        { fontWeight: "normal" },
      ]}
    />
  );
}
