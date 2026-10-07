import { StyleSheet, View } from "react-native";
import Slider from "@react-native-community/slider";
import { DesignIcon } from "./DesignIcon";
import { designAssets } from "./designAssets";
import { colors } from "../theme";

// Keep native slider interaction and accessibility while drawing the Figma track and thumb.
export function TargetSlider({
  label,
  value,
  maximum,
  color,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  maximum: number;
  color: string;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const ratio = Math.min(1, Math.max(0, value / maximum));
  return (
    <View style={s.container}>
      <View pointerEvents="none" style={s.track}>
        <View
          style={{
            height: 6,
            width: `${ratio * 100}%`,
            backgroundColor: color,
            borderRadius: 3,
          }}
        />
      </View>
      <View pointerEvents="none" style={[s.thumbRail, { left: 8, right: 8 }]}>
        <View
          style={{
            position: "absolute",
            left: `${ratio * 100}%`,
            marginLeft: -8,
          }}
        >
          <DesignIcon asset={designAssets["3-1370"].imgEllipse} />
        </View>
      </View>
      <Slider
        accessibilityLabel={label}
        minimumValue={0}
        maximumValue={maximum}
        step={1}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor="transparent"
        maximumTrackTintColor="transparent"
        thumbTintColor="transparent"
        disabled={disabled}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
const s = StyleSheet.create({
  container: { height: 44 },
  track: {
    position: "absolute",
    top: 19,
    left: 8,
    right: 8,
    height: 6,
    backgroundColor: colors.line,
    borderRadius: 3,
    overflow: "hidden",
  },
  thumbRail: { position: "absolute", top: 14, height: 16 },
});
