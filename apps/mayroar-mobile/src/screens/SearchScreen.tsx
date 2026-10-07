import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useDatabase } from "../data/session";
import { customFoods, favouriteFoods, recentFoods } from "../data/database";
import { catalogueConfigured, searchFoods } from "../data/foodSearch";
import {
  localDay,
  numberLabel,
  readMeal,
  validDay,
  type Food,
} from "../domain/nutrition";
import {
  AssetButton,
  BottomTabs,
  Button,
  Message,
  Page,
  ui,
} from "../components/ui";
import { PortionSheet } from "../components/PortionSheet";
import { Text } from "../components/Text";
import { DesignIcon } from "../components/DesignIcon";
import { designAssets } from "../components/designAssets";
import { colors, fonts } from "../theme";

const assets = designAssets["3-244"];
export default function SearchScreen() {
  const db = useDatabase();
  const params = useLocalSearchParams<{
    date?: string;
    meal?: string;
    barcode?: string;
    tab?: string;
  }>();
  const day = validDay(params.date) ? params.date : localDay();
  const meal = readMeal(params.meal);
  const [query, setQuery] = useState("");
  const [barcode, setBarcode] = useState(params.barcode ?? "");
  const [tab, setTab] = useState(params.tab === "my" ? "my" : "all");
  const [foods, setFoods] = useState<Food[]>([]);
  const [favourites, setFavourites] = useState<Food[]>([]);
  const [recent, setRecent] = useState<Food[]>([]);
  const [selected, setSelected] = useState<Food | null>(null);
  const [busy, setBusy] = useState(Boolean(params.barcode));
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setRevision((value) => value + 1);
    }, []),
  );
  useEffect(() => {
    let active = true;
    Promise.all([favouriteFoods(db), recentFoods(db)])
      .then(([saved, history]) => {
        if (active) {
          setFavourites(saved);
          setRecent(history);
        }
      })
      .catch(() => {
        if (active) setError("Could not read your saved foods.");
      });
    return () => {
      active = false;
    };
  }, [db, revision]);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const searching = Boolean(barcode || query.trim().length >= 2);
    const debounce = setTimeout(
      async () => {
        setBusy(searching);
        setFoods([]);
        setError("");
        try {
          const saved = await customFoods(db, barcode ? "" : query);
          const local = barcode
            ? saved.filter(
                (food) =>
                  food.barcode === barcode ||
                  (barcode.length === 13 &&
                    barcode.startsWith("0") &&
                    food.barcode === barcode.slice(1)) ||
                  (barcode.length === 12 && food.barcode === `0${barcode}`),
              )
            : saved;
          if (active) setFoods(local);
          if (!searching || tab === "my" || !catalogueConfigured) return;
          timeout = setTimeout(() => controller.abort(), 12000);
          const remote = await searchFoods(
            query,
            controller.signal,
            barcode || undefined,
          );
          if (active) setFoods([...local, ...remote]);
        } catch {
          if (active)
            setError(
              controller.signal.aborted
                ? "Food search took too long. Please try again."
                : "Could not reach the food catalogue. Check your internet connection and API server.",
            );
        } finally {
          if (timeout) clearTimeout(timeout);
          if (active) setBusy(false);
        }
      },
      searching ? 300 : 0,
    );
    return () => {
      active = false;
      clearTimeout(debounce);
      if (timeout) clearTimeout(timeout);
      controller.abort();
    };
  }, [db, query, barcode, tab, revision]);
  const searching = Boolean(barcode || query.trim().length >= 2);
  const browseSaved = !searching && tab === "all";
  const rows = browseSaved
    ? [
        ...favourites.map((food) => ({ food, section: "FAVOURITES" })),
        ...recent.map((food) => ({ food, section: "RECENTLY LOGGED" })),
      ]
    : foods.map((food) => ({
        food,
        section: tab === "my" ? "MY FOODS" : "SEARCH RESULTS",
      }));
  return (
    <Page scroll={false}>
      <View style={s.top}>
        <View style={s.searchRow}>
          <AssetButton
            asset={assets.imgChevronLeft}
            label="Back to diary"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/")
            }
          />
          <View style={s.inputWrap}>
            <DesignIcon asset={assets.imgSearch} />
            <TextInput
              accessibilityLabel="Search food or brand"
              style={s.input}
              value={barcode || query}
              placeholder="Search food or brand"
              placeholderTextColor={colors.muted}
              autoCorrect={false}
              maxLength={80}
              returnKeyType="search"
              onChangeText={(value) => {
                setBarcode("");
                setQuery(value);
                setFoods([]);
                setBusy(value.trim().length >= 2);
              }}
            />
            {query || barcode ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                onPress={() => {
                  setQuery("");
                  setBarcode("");
                  setFoods([]);
                }}
                style={s.clear}
              >
                <DesignIcon asset={assets.imgXCircle} />
              </Pressable>
            ) : null}
          </View>
        </View>
        <View style={s.tabs}>
          {[
            ["all", "All Foods"],
            ["my", "My Foods"],
          ].map(([key, label]) => (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === key }}
              onPress={() => setTab(key)}
              style={[s.tab, tab === key && s.tabActive]}
            >
              <Text style={[s.tabText, tab === key && { color: colors.green }]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <FlatList
        keyboardShouldPersistTaps="handled"
        data={rows}
        keyExtractor={(item, index) =>
          `${item.section}:${item.food.id}:${index}`
        }
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
              <Button secondary onPress={() => router.push({ pathname: "/photo", params: { date: day, meal } })}>Upload meal photo</Button>

            {!catalogueConfigured ? (
              <Message>
                Start the Python API to search and load your foods.
              </Message>
            ) : null}
            {barcode ? <Message>Barcode: {barcode}</Message> : null}
            {busy ? <ActivityIndicator color={colors.olive} /> : null}
            {error ? (
              <>
                <Message error>{error}</Message>
                <Button secondary onPress={() => setRevision((v) => v + 1)}>
                  Retry search
                </Button>
              </>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !busy ? (
            <View style={{ gap: 10, paddingVertical: 20 }}>
              <Text style={ui.subheading}>
                {tab === "my"
                  ? "Your foods, in one place"
                  : searching
                    ? "No foods found"
                    : "What are you eating?"}
              </Text>
              <Message>
                {searching
                  ? "Try another name or enter the nutrition label below."
                  : tab === "my"
                    ? "Create a custom food from its label to save it here."
                    : "Search with at least two letters. Favourites and recently logged foods will appear here."}
              </Message>
            </View>
          ) : null
        }
        renderItem={({ item, index }) => (
          <View style={{ gap: 12 }}>
            {index === 0 || rows[index - 1].section !== item.section ? (
              <Text style={s.section}>{item.section}</Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Choose ${item.food.name}`}
              onPress={() => setSelected(item.food)}
              style={({ pressed }) => [s.result, pressed && ui.pressed]}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.foodName}>{item.food.name}</Text>
                <Text style={s.foodMeta}>
                  {item.food.brand ?? item.food.sourceName} · 100 g
                </Text>
              </View>
              <Text style={s.calories}>
                {numberLabel(item.food.per100g.calories)} kcal
              </Text>
              {item.section === "FAVOURITES" ? (
                <DesignIcon asset={assets.imgHeart} />
              ) : null}
            </Pressable>
          </View>
        )}
        ListFooterComponent={
          <View style={{ paddingVertical: 16, gap: 16 }}>
            {foods.length >= 30 && searching ? (
              <Message>
                Showing the first matches. Add a brand or more words to narrow
                the search.
              </Message>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: "/custom-food",
                  params: { date: day, meal, barcode },
                })
              }
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Text style={s.create}>Can’t find it? Create Custom Food →</Text>
            </Pressable>
          </View>
        }
      />
      <BottomTabs screen="3-244" />
      {selected ? (
        <PortionSheet
          food={selected}
          day={day}
          initialMeal={meal}
          onClose={() => {
            setSelected(null);
            setRevision((v) => v + 1);
          }}
        />
      ) : null}
    </Page>
  );
}
const s = StyleSheet.create({
  top: { paddingHorizontal: 16, paddingTop: 8 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: -10,
    gap: 2,
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 14,
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 0.5,
    borderColor: colors.line,
    gap: 8,
    minHeight: 42,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.charcoal,
    paddingVertical: 10,
  },
  clear: { padding: 12 },
  tabs: {
    flexDirection: "row",
    gap: 28,
    marginTop: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.line,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: colors.olive },
  tabText: { fontSize: 14, fontWeight: "600", color: colors.muted },
  list: { padding: 16, gap: 12, paddingBottom: 30 },
  section: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
    marginTop: 8,
  },
  result: {
    backgroundColor: colors.white,
    borderWidth: 0.5,
    borderColor: colors.line,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 72,
  },
  foodName: { fontSize: 14, fontWeight: "600" },
  foodMeta: { fontSize: 12, color: colors.muted },
  calories: { fontSize: 14, fontWeight: "600", color: colors.green },
  create: {
    color: colors.green,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
