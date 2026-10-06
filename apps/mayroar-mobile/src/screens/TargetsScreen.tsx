import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TargetSlider } from "../components/TargetSlider";
import { useSQLiteContext } from "expo-sqlite";
import { router } from "expo-router";
import { decimal, numberLabel, type Targets } from "../domain/nutrition";
import { readTargets, saveTargets } from "../data/database";
import { Button, Header, Message, Page, ui } from "../components/ui";
import { Text } from "../components/Text";
import { DesignIcon } from "../components/DesignIcon";
import { designAssets } from "../components/designAssets";
import { colors, fonts } from "../constants/theme";

const assets = designAssets["3-1370"];
export default function TargetsScreen() {
  const db = useSQLiteContext();
  const [values, setValues] = useState({
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const saving = useRef(false);
  useEffect(() => {
    let active = true;
    readTargets(db)
      .then((goals) => {
        if (active && goals)
          setValues({
            calories: String(goals.calories),
            protein: String(goals.protein),
            carbs: String(goals.carbs),
            fat: String(goals.fat),
          });
      })
      .catch(() => {
        if (active) setError("Could not load your targets.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [db]);
  async function save() {
    if (saving.current) return;
    const parsed = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, decimal(value)]),
    );
    if (
      Object.values(parsed).some(
        (value) => value === null || value <= 0 || value > 100000,
      )
    ) {
      setError("Enter a valid number above zero for every target.");
      return;
    }
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      await saveTargets(db, parsed as Targets);
      if (router.canGoBack()) router.back();
      else router.replace("/");
    } catch {
      setError("Could not save your targets. Please try again.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  const macroEnergy =
    (decimal(values.protein) ?? 0) * 4 +
    (decimal(values.carbs) ?? 0) * 4 +
    (decimal(values.fat) ?? 0) * 9;
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Page scroll={false}>
        <View style={{ paddingHorizontal: 16 }}>
          <Header title="Adjust Targets" asset={assets.imgChevronLeft} />
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}
        >
          <View style={{ gap: 8 }}>
            <Text style={s.title}>Edit your targets</Text>
            <Text style={ui.body}>
              Fine-tune your daily calorie and macro goals.
            </Text>
            <Message>
              Enter the targets you have chosen. MayRoar does not calculate
              personal recommendations in this version.
            </Message>
          </View>
          {loading ? (
            <ActivityIndicator color={colors.olive} />
          ) : (
            <>
              <View style={{ gap: 10 }}>
                <Text style={ui.label}>DAILY CALORIES</Text>
                <View style={s.caloriePill}>
                  <TextInput
                    accessibilityLabel="Daily calories (kcal)"
                    keyboardType="decimal-pad"
                    value={values.calories}
                    onChangeText={(value) =>
                      setValues((current) => ({ ...current, calories: value }))
                    }
                    editable={!busy}
                    placeholder="Enter target"
                    maxLength={8}
                    style={s.calories}
                  />
                  <Text style={s.kcal}>kcal</Text>
                </View>
              </View>
              {(["protein", "carbs", "fat"] as const).map((key, index) => {
                const value = decimal(values[key]) ?? 0;
                return (
                  <View key={key} style={{ gap: 14 }}>
                    <View style={s.macroHeader}>
                      <Text style={s.macroName}>
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </Text>
                      <View style={s.macroInputWrap}>
                        <TextInput
                          accessibilityLabel={`Daily ${key} (g)`}
                          keyboardType="decimal-pad"
                          value={values[key]}
                          onChangeText={(text) =>
                            setValues((current) => ({
                              ...current,
                              [key]: text,
                            }))
                          }
                          editable={!busy}
                          maxLength={8}
                          placeholder="—"
                          style={s.macroInput}
                        />
                        <Text style={ui.body}>g</Text>
                      </View>
                    </View>
                    <TargetSlider
                      label={`${key} target slider`}
                      maximum={Math.max(key === "fat" ? 200 : 500, value)}
                      value={value}
                      onChange={(amount) =>
                        setValues((current) => ({
                          ...current,
                          [key]: String(amount),
                        }))
                      }
                      color={index === 0 ? colors.olive : colors.sage}
                      disabled={busy}
                    />
                  </View>
                );
              })}
              <View style={s.notice}>
                <DesignIcon asset={assets.imgZap} />
                <Text style={s.noticeText}>
                  Your macros provide approximately {numberLabel(macroEnergy)}{" "}
                  kcal (protein × 4 + carbs × 4 + fat × 9).
                </Text>
              </View>
            </>
          )}
          {error ? <Message error>{error}</Message> : null}
        </ScrollView>
        <SafeAreaView edges={["bottom"]} style={ui.fixedAction}>
          <Button onPress={() => void save()} busy={busy} disabled={loading}>
            Save & Apply Targets
          </Button>
        </SafeAreaView>
      </Page>
    </KeyboardAvoidingView>
  );
}
const s = StyleSheet.create({
  content: { padding: 24, paddingTop: 16, gap: 30, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "700" },
  caloriePill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 0.5,
    borderRadius: 25,
    paddingHorizontal: 24,
    minHeight: 62,
  },
  calories: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.charcoal,
    textAlign: "center",
    minWidth: 90,
    maxWidth: 230,
    paddingVertical: 14,
  },
  kcal: { fontSize: 14, color: colors.muted },
  macroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  macroName: { fontSize: 14, fontWeight: "600" },
  macroInputWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  macroInput: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.charcoal,
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 8,
    minWidth: 70,
    textAlign: "right",
  },
  notice: {
    backgroundColor: colors.pink,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  noticeText: { flex: 1, fontSize: 12, color: colors.charcoal },
});
