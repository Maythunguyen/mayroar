import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { randomUUID } from "expo-crypto";
import { saveCustomFood } from "../data/database";
import {
  decimal,
  localDay,
  loggingIssue,
  readMeal,
  validDay,
  type Food,
  type Nutrients,
} from "../domain/nutrition";
import { Button, Field, Header, Message, Page, ui } from "../components/ui";
import { Text } from "../components/Text";
import { DesignIcon } from "../components/DesignIcon";
import { designAssets } from "../components/designAssets";
import { colors } from "../constants/theme";

const assets = designAssets["3-486"];
export default function CustomFoodScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{
    date?: string;
    meal?: string;
    barcode?: string;
  }>();
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [barcode, setBarcode] = useState(params.barcode ?? "");
  const [basis, setBasis] = useState<"100g" | "serving">("100g");
  const [servingGrams, setServingGrams] = useState("");
  const [values, setValues] = useState({
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });
  const [extras, setExtras] = useState({ fibre: "", sugars: "" });
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  async function save() {
    if (saving.current) return;
    setError("");
    if (!name.trim()) {
      setError("Enter the food’s name.");
      return;
    }
    if (barcode.trim() && !/^\d{8,14}$/.test(barcode.trim())) {
      setError("Enter a barcode with 8 to 14 digits, or leave it blank.");
      return;
    }
    const mass = basis === "100g" ? 100 : decimal(servingGrams);
    if (mass === null || mass <= 0 || mass > 10000) {
      setError("Enter the serving’s weight in grams.");
      return;
    }
    const sourceFoodId = randomUUID();
    const factor = 100 / mass;
    const food: Food = {
      id: `custom:${sourceFoodId}`,
      name: name.trim(),
      brand: brand.trim() || null,
      barcode: barcode.trim() || null,
      sourceId: "custom",
      sourceFoodId,
      sourceName: "Your label entry",
      sourceVersion: "",
      qualityTier: "custom",
      attribution: "Nutrition values entered by you from a food label.",
      portions: basis === "serving" ? [{ label: "serving", grams: mass }] : [],
      per100g: Object.fromEntries(
        Object.entries(values).map(([key, value]) => {
          const parsed = decimal(value);
          return [key, parsed === null ? null : parsed * factor];
        }),
      ) as Nutrients,
      extra: {
        fibre: extras.fibre.trim() ? decimal(extras.fibre) : null,
        sugars: extras.sugars.trim() ? decimal(extras.sugars) : null,
      },
    };
    for (const key of ["fibre", "sugars"] as const) {
      const value = food.extra![key];
      if (extras[key].trim() && (value === null || value * factor > 100)) {
        setError(`Check ${key}; it must be between 0 and 100 g per 100 g.`);
        return;
      }
      food.extra![key] = value === null ? null : value * factor;
    }
    const issue = loggingIssue(food);
    if (issue) {
      setError(issue);
      return;
    }
    saving.current = true;
    setBusy(true);
    try {
      await saveCustomFood(db, food);
      router.replace({
        pathname: "/search",
        params: {
          date: validDay(params.date) ? params.date : localDay(),
          meal: readMeal(params.meal),
          tab: "my",
        },
      });
    } catch {
      setError("Could not save this food. Please try again.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Page scroll={false}>
        <View style={{ paddingHorizontal: 16 }}>
          <Header title="Create Custom Food" asset={assets.imgXCircle} />
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}
        >
          <Field
            label="Food name"
            placeholder="e.g. Homemade protein oats"
            value={name}
            onChangeText={setName}
            maxLength={120}
            editable={!busy}
          />
          <Field
            label="Brand (optional)"
            placeholder="e.g. MayRoar Kitchen"
            value={brand}
            onChangeText={setBrand}
            maxLength={80}
            editable={!busy}
          />
          <View style={s.barcode}>
            <View style={{ flex: 1 }}>
              <Field
                label="Barcode (optional)"
                value={barcode}
                onChangeText={setBarcode}
                keyboardType="number-pad"
                maxLength={14}
                editable={!busy}
                placeholder="Enter barcode"
              />
            </View>
            <View style={{ paddingBottom: 12 }}>
              <DesignIcon asset={assets.imgScanBarcode} />
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <Text style={ui.label}>NUTRITION VALUES</Text>
            <View style={s.basis}>
              {[
                ["100g", "Per 100 g"],
                ["serving", "Per serving"],
              ].map(([key, label]) => (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: basis === key }}
                  onPress={() => setBasis(key as "100g" | "serving")}
                  style={[
                    s.basisItem,
                    basis === key && { backgroundColor: colors.pink },
                  ]}
                >
                  <Text style={s.basisLabel}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <Message>
              Use the label’s weight-based values. Blank means unknown; enter 0
              only when the label says zero.
            </Message>
          </View>
          {basis === "serving" ? (
            <Field
              label="Serving weight (g)"
              value={servingGrams}
              onChangeText={setServingGrams}
              keyboardType="decimal-pad"
              maxLength={10}
              placeholder="Weight of one serving"
            />
          ) : null}
          <Field
            label="Energy (kcal)"
            value={values.calories}
            onChangeText={(value) =>
              setValues((current) => ({ ...current, calories: value }))
            }
            keyboardType="decimal-pad"
            maxLength={10}
            editable={!busy}
            placeholder="0"
          />
          <View style={s.macros}>
            {(["protein", "carbs", "fat"] as const).map((key) => (
              <View style={{ flex: 1 }} key={key}>
                <Field
                  label={`${key} (g)`}
                  value={values[key]}
                  onChangeText={(value) =>
                    setValues((current) => ({ ...current, [key]: value }))
                  }
                  keyboardType="decimal-pad"
                  maxLength={10}
                  editable={!busy}
                  placeholder="0"
                  style={{ borderRadius: 8 }}
                />
              </View>
            ))}
          </View>
          <Message>
            Carbs means available carbohydrate, excluding fibre. Energy is in
            kcal, not kJ. A volume label (per 100 ml) needs the product’s weight
            before it can be logged in grams.
          </Message>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            onPress={() => setExpanded((value) => !value)}
            style={s.more}
          >
            <DesignIcon asset={assets.imgPillBottle} />
            <Text style={s.moreLabel}>More nutrients (optional)</Text>
            <DesignIcon asset={assets.imgChevronDown} />
          </Pressable>
          {expanded ? (
            <View style={s.macros}>
              {(["fibre", "sugars"] as const).map((key) => (
                <View key={key} style={{ flex: 1 }}>
                  <Field
                    label={`${key} (g)`}
                    value={extras[key]}
                    onChangeText={(value) =>
                      setExtras((current) => ({ ...current, [key]: value }))
                    }
                    keyboardType="decimal-pad"
                    maxLength={10}
                    editable={!busy}
                  />
                </View>
              ))}
            </View>
          ) : null}
          {error ? <Message error>{error}</Message> : null}
        </ScrollView>
        <SafeAreaView edges={["bottom"]} style={ui.fixedAction}>
          <Button onPress={() => void save()} busy={busy}>
            Save to My Foods
          </Button>
        </SafeAreaView>
      </Page>
    </KeyboardAvoidingView>
  );
}
const s = StyleSheet.create({
  content: { padding: 16, paddingTop: 8, gap: 20, paddingBottom: 32 },
  barcode: { flexDirection: "row", gap: 14, alignItems: "flex-end" },
  basis: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 4,
    flexDirection: "row",
  },
  basisItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    minHeight: 40,
    borderRadius: 9,
  },
  basisLabel: { fontSize: 13, fontWeight: "600" },
  macros: { flexDirection: "row", gap: 10 },
  more: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 },
  moreLabel: { flex: 1, fontSize: 14, fontWeight: "500" },
});
