import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDatabase } from "../data/session";
import { router } from "expo-router";
import {
  addEntry,
  deleteEntry,
  entriesForDay,
  favouriteFoods,
  toggleFavourite,
  updateEntry,
} from "../data/database";
import {
  decimal,
  formatDay,
  loggingIssue,
  MEALS,
  numberLabel,
  portion,
  sourceLabel,
  totals,
  type Entry,
  type Food,
  type Meal,
} from "../domain/nutrition";
import { AssetButton, Button, Header, Message, ui } from "./ui";
import { Text } from "./Text";
import { DesignIcon } from "./DesignIcon";
import { designAssets } from "./designAssets";
import { NutritionCard } from "./NutritionCard";
import { colors, fonts } from "../theme";

const quantityAssets = designAssets["3-2338"];
const mealAssets = designAssets["3-2411"];
const detailsAssets = designAssets["3-322"];
const mealIcons = [
  mealAssets.imgSun,
  mealAssets.imgSandwich,
  mealAssets.imgUtensilsCrossed,
  mealAssets.imgApple,
];

export function PortionSheet({
  food,
  day,
  initialMeal,
  onClose,
  entry,
}: {
  food: Food;
  day: string;
  initialMeal: Meal;
  onClose: () => void;
  entry?: Entry;
}) {
  const db = useDatabase();
  const [step, setStep] = useState<"details" | "quantity" | "meal">(
    entry ? "quantity" : "details",
  );
  const [weight, setWeight] = useState(String(entry?.grams ?? 100));
  const [unit, setUnit] = useState(0);
  const [meal, setMeal] = useState(initialMeal);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [favourite, setFavourite] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dayEntries, setDayEntries] = useState<Entry[]>([]);
  const saving = useRef(false);
  const units = [
    { label: "g", grams: 1 },
    { label: "oz", grams: 28.349523125 },
    ...(food.portions ?? []),
  ];
  const entered = decimal(weight);
  const grams = entered === null ? null : entered * units[unit].grams;
  const issue = loggingIssue(food);
  const valid = grams !== null && grams > 0 && grams <= 10000 && !issue;
  const amounts = valid ? portion(food, grams!) : food.per100g;
  useEffect(() => {
    let active = true;
    Promise.all([entriesForDay(db, day), favouriteFoods(db)])
      .then(([items, favourites]) => {
        if (active) {
          setDayEntries(items);
          setFavourite(favourites.some((item) => item.id === food.id));
        }
      })
      .catch(() => {
        if (active) setError("Could not load saved meal details.");
      });
    return () => {
      active = false;
    };
  }, [db, day, food.id]);

  function chooseUnit(index: number) {
    if (grams !== null)
      setWeight(String(Math.round((grams / units[index].grams) * 1000) / 1000));
    setUnit(index);
  }
  async function save(remove = false) {
    if (saving.current || (!remove && !valid)) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      if (remove && entry) await deleteEntry(db, entry.id);
      else if (entry) await updateEntry(db, entry, grams!, meal);
      else await addEntry(db, day, meal, food, grams!);
      onClose();
      if (!entry) router.dismissTo({ pathname: "/", params: { date: day } });
    } catch {
      setError("Could not save your diary. Please try again.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  async function favouritePress() {
    if (busy) return;
    setBusy(true);
    try {
      setFavourite(await toggleFavourite(db, food));
    } catch {
      setError("Could not update favourites.");
    } finally {
      setBusy(false);
    }
  }
  const close = () => {
    if (!busy) onClose();
  };
  const back = () => {
    if (busy) return;
    if (step === "meal") setStep("quantity");
    else if (step === "quantity" && !entry) setStep("details");
    else close();
  };
  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={back}
    >
      <SafeAreaView
        style={[ui.page, Platform.OS === "web" && { paddingTop: 20 }]}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={{ paddingHorizontal: 16 }}>
            <Header
              title={
                step === "details"
                  ? "Food Details"
                  : step === "quantity"
                    ? food.name
                    : entry
                      ? "Edit Diary Entry"
                      : "Add to Diary"
              }
              asset={
                step === "details"
                  ? detailsAssets.imgChevronLeft
                  : step === "quantity"
                    ? quantityAssets.imgChevronLeft
                    : mealAssets.imgChevronLeft
              }
              onBack={back}
              right={
                step === "details" ? (
                  <AssetButton
                    asset={detailsAssets.imgHeartPlus}
                    label={
                      favourite ? "Remove from favourites" : "Add to favourites"
                    }
                    onPress={() => void favouritePress()}
                    disabled={busy}
                  />
                ) : (
                  <AssetButton
                    asset={
                      step === "quantity"
                        ? quantityAssets.imgXCircle
                        : mealAssets.imgXCircle
                    }
                    label="Close food details"
                    onPress={close}
                    disabled={busy}
                  />
                )
              }
            />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.content}
          >
            {step === "details" ? (
              <>
                <View style={{ gap: 6 }}>
                  <Text style={s.foodHeading}>{food.name}</Text>
                  <Text style={s.source}>
                    {food.brand ? `${food.brand} · ` : ""}
                    {sourceLabel(food)}
                  </Text>
                  {favourite ? (
                    <Text style={s.favourite}>Saved to favourites</Text>
                  ) : null}
                </View>
                <View style={s.quantityInfo}>
                  <View>
                    <Text style={ui.label}>QUANTITY</Text>
                    <Text style={s.infoValue}>100</Text>
                  </View>
                  <View>
                    <Text style={ui.label}>SERVING UNIT</Text>
                    <Text style={s.infoValue}>grams (g)</Text>
                  </View>
                </View>
                <NutritionCard
                  values={food.per100g}
                  label="TOTAL CALORIES"
                  divider={detailsAssets.imgLine}
                />
                <Text style={ui.label}>MORE NUTRIENTS · PER 100 G</Text>
                {(["fibre", "sugars"] as const).map((key) => (
                  <View key={key} style={s.nutrient}>
                    <Text style={s.nutrientLabel}>
                      {key === "fibre" ? "Dietary fibre" : "Sugars"}
                    </Text>
                    <Text style={s.nutrientLabel}>
                      {food.extra?.[key] == null
                        ? "Not available"
                        : `${numberLabel(food.extra[key], 1)} g`}
                    </Text>
                  </View>
                ))}
                <Message>{food.attribution}</Message>
                <Message>
                  {food.sourceName}
                  {food.sourceVersion ? ` · ${food.sourceVersion}` : ""}
                  {food.licence ? ` · ${food.licence}` : ""}
                </Message>
                {food.sourceUrl && /^https:\/\//.test(food.sourceUrl) ? (
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => {
                      void Linking.openURL(food.sourceUrl!).catch(() =>
                        setError("Could not open the source website."),
                      );
                    }}
                    style={{ minHeight: 44, justifyContent: "center" }}
                  >
                    <Text style={{ color: colors.green, fontSize: 13 }}>
                      View food data source →
                    </Text>
                  </Pressable>
                ) : null}
              </>
            ) : step === "quantity" ? (
              <>
                <Text style={s.centerSource}>
                  {food.brand ?? sourceLabel(food)}
                </Text>
                <Text style={[ui.label, s.center, { marginTop: 24 }]}>
                  ENTER QUANTITY
                </Text>
                <View style={s.amountRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Decrease quantity"
                    disabled={busy}
                    onPress={() =>
                      setWeight(
                        String(
                          Math.max(
                            units[unit].grams === 1 ? 1 : 0.1,
                            (entered ?? 0) - (unit === 0 ? 10 : 1),
                          ),
                        ),
                      )
                    }
                    style={s.round}
                  >
                    <DesignIcon asset={quantityAssets.imgMinus} />
                  </Pressable>
                  <TextInput
                    accessibilityLabel="Quantity"
                    keyboardType="decimal-pad"
                    value={weight}
                    onChangeText={setWeight}
                    selectTextOnFocus
                    maxLength={10}
                    editable={!busy}
                    style={s.amount}
                  />
                  <Text style={s.amountUnit}>{units[unit].label}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Increase quantity"
                    disabled={busy}
                    onPress={() =>
                      setWeight(String((entered ?? 0) + (unit === 0 ? 10 : 1)))
                    }
                    style={s.round}
                  >
                    <DesignIcon asset={quantityAssets.imgPlus} />
                  </Pressable>
                </View>
                <Text style={[ui.label, s.center]}>UNIT</Text>
                <View style={s.units}>
                  {units.map((item, index) => (
                    <Pressable
                      key={`${item.label}-${index}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: unit === index }}
                      onPress={() => chooseUnit(index)}
                      style={[s.unit, index === unit && s.unitActive]}
                    >
                      <Text
                        style={[
                          s.unitLabel,
                          index === unit && { color: colors.white },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={[ui.label, s.center]}>QUICK SELECT</Text>
                <View style={s.quick}>
                  {[100, 150, 200, 250].map((value) => (
                    <Pressable
                      key={value}
                      accessibilityRole="button"
                      onPress={() => {
                        setUnit(0);
                        setWeight(String(value));
                      }}
                      style={[
                        s.quickChip,
                        grams === value && {
                          backgroundColor: colors.pink,
                          borderColor: colors.olive,
                        },
                      ]}
                    >
                      <Text style={s.quickLabel}>{value} g</Text>
                    </Pressable>
                  ))}
                </View>
                <NutritionCard
                  values={amounts}
                  label={valid ? "ESTIMATED ENERGY" : "PER 100 G"}
                  divider={quantityAssets.imgLine}
                />
                {entry ? (
                  <View style={{ gap: 10 }}>
                    {confirmDelete ? (
                      <>
                        <Message error>
                          Remove this food from {entry.meal.toLowerCase()}?
                        </Message>
                        <Button
                          secondary
                          busy={busy}
                          onPress={() => void save(true)}
                        >
                          Remove food
                        </Button>
                        <Button
                          secondary
                          disabled={busy}
                          onPress={() => setConfirmDelete(false)}
                        >
                          Keep food
                        </Button>
                      </>
                    ) : (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setConfirmDelete(true)}
                      >
                        <Text style={s.remove}>Remove from diary</Text>
                      </Pressable>
                    )}
                  </View>
                ) : null}
              </>
            ) : (
              <>
                <Text style={s.centerSource}>
                  {food.name} · {numberLabel(grams, 1)} g
                </Text>
                <View style={{ gap: 4, marginTop: 8 }}>
                  <Text style={ui.subheading}>Add to which meal?</Text>
                  <Message>{formatDay(day)}</Message>
                </View>
                {MEALS.map((item, index) => {
                  const logged = dayEntries.filter(
                    (record) => record.meal === item && record.id !== entry?.id,
                  );
                  return (
                    <Pressable
                      key={item}
                      accessibilityRole="button"
                      accessibilityState={{ selected: meal === item }}
                      onPress={() => setMeal(item)}
                      style={[
                        s.meal,
                        item === meal && {
                          backgroundColor: colors.pink,
                          borderColor: colors.olive,
                        },
                      ]}
                    >
                      <View
                        style={[
                          s.mealIcon,
                          item === meal && { backgroundColor: colors.olive },
                        ]}
                      >
                        <DesignIcon asset={mealIcons[index]} />
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={s.mealName}>{item}</Text>
                        <Text style={s.source}>
                          {logged.length
                            ? `${logged.length} ${logged.length === 1 ? "food" : "foods"} logged`
                            : "Nothing logged yet"}
                        </Text>
                      </View>
                      <Text style={s.mealCalories}>
                        {numberLabel(totals(logged).calories)} kcal
                      </Text>
                    </Pressable>
                  );
                })}
              </>
            )}
            {issue ? (
              <Message error>{issue}</Message>
            ) : !valid ? (
              <Message error>
                Enter a weight above 0 and no more than 10,000 g.
              </Message>
            ) : null}
            {error ? <Message error>{error}</Message> : null}
          </ScrollView>
          <View style={ui.fixedAction}>
            <Button
              busy={busy}
              disabled={!valid}
              onPress={() =>
                step === "details"
                  ? setStep("quantity")
                  : step === "quantity"
                    ? setStep("meal")
                    : void save()
              }
            >
              {step === "details"
                ? "Select Quantity"
                : step === "quantity"
                  ? "Confirm Quantity"
                  : entry
                    ? "Save Changes"
                    : `Log to ${meal}`}
            </Button>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
const s = StyleSheet.create({
  content: { padding: 20, paddingTop: 8, gap: 16, paddingBottom: 28 },
  foodHeading: { fontSize: 22, fontWeight: "700" },
  source: { fontSize: 12, color: colors.muted },
  centerSource: { fontSize: 12, color: colors.muted, textAlign: "center" },
  favourite: { fontSize: 12, color: colors.green },
  quantityInfo: { flexDirection: "row", gap: 64, paddingVertical: 6 },
  infoValue: { fontSize: 16, marginTop: 8 },
  nutrient: {
    borderRadius: 12,
    backgroundColor: colors.charcoal,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  nutrientLabel: { color: colors.cream, fontSize: 14 },
  center: { textAlign: "center" },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 80,
  },
  round: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
  },
  amount: {
    flex: 1,
    minWidth: 70,
    maxWidth: 130,
    fontFamily: fonts.bold,
    fontSize: 48,
    color: colors.charcoal,
    textAlign: "right",
    padding: 0,
  },
  amountUnit: { fontSize: 18, color: colors.muted, maxWidth: 60 },
  units: {
    flexDirection: "row",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 4,
    flexWrap: "wrap",
    gap: 4,
  },
  unit: {
    minWidth: 64,
    minHeight: 42,
    padding: 10,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  unitActive: { backgroundColor: colors.olive },
  unitLabel: { fontSize: 14, fontWeight: "600" },
  quick: { flexDirection: "row", gap: 8 },
  quickChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
    alignItems: "center",
  },
  quickLabel: { fontSize: 13, fontWeight: "500" },
  remove: {
    color: colors.error,
    textAlign: "center",
    fontSize: 13,
    padding: 12,
  },
  meal: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 82,
  },
  mealIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cream,
    justifyContent: "center",
    alignItems: "center",
  },
  mealName: { fontSize: 16, fontWeight: "600" },
  mealCalories: { fontSize: 14, fontWeight: "600" },
});
