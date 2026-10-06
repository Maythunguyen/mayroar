import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import {
  AssetButton,
  BottomTabs,
  Button,
  Field,
  Header,
  Message,
  Page,
} from "../components/ui";
import { Text } from "../components/Text";
import { DesignIcon } from "../components/DesignIcon";
import { designAssets } from "../components/designAssets";
import { localDay, readMeal, validDay } from "../domain/nutrition";
import { colors } from "../constants/theme";

const assets = designAssets["3-433"];
export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const params = useLocalSearchParams<{ date?: string; meal?: string }>();
  const [manual, setManual] = useState("");
  const [showManual, setShowManual] = useState(Platform.OS === "web");
  const [torch, setTorch] = useState(false);
  const [error, setError] = useState("");
  const scanned = useRef(false);
  function lookup(code: string) {
    if (!/^\d{8,14}$/.test(code)) {
      setError("Enter a barcode with 8 to 14 digits.");
      return;
    }
    if (scanned.current) return;
    scanned.current = true;
    router.replace({
      pathname: "/search",
      params: {
        date: validDay(params.date) ? params.date : localDay(),
        meal: readMeal(params.meal),
        barcode: code,
      },
    });
  }
  async function allowCamera() {
    try {
      if (permission?.canAskAgain) await requestPermission();
      else await Linking.openSettings();
    } catch {
      setError("Could not open camera access. Enter the barcode below.");
      setShowManual(true);
    }
  }
  return (
    <Page scroll={false}>
      <View style={{ paddingHorizontal: 16 }}>
        <Header
          title="Scan Barcode"
          asset={assets.imgXCircle}
          right={
            <AssetButton
              asset={assets.imgZap}
              label={torch ? "Turn flash off" : "Turn flash on"}
              onPress={() => setTorch((value) => !value)}
              disabled={Platform.OS === "web" || !permission?.granted}
            />
          }
        />
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.content}
      >
        <View style={s.camera}>
          {Platform.OS === "web" ? (
            <View style={s.cameraMessage}>
              <Text style={s.cameraTitle}>Scan on your phone</Text>
              <Text style={s.cameraText}>
                Use the mobile app to scan a product, or enter its barcode
                below.
              </Text>
            </View>
          ) : !permission ? (
            <ActivityIndicator color={colors.pale} />
          ) : permission.granted ? (
            <>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                enableTorch={torch}
                barcodeScannerSettings={{
                  barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"],
                }}
                onBarcodeScanned={({ data }) => lookup(data)}
                onMountError={() => {
                  setError(
                    "The camera could not start. Enter the barcode below.",
                  );
                  setShowManual(true);
                }}
              />
              <View pointerEvents="none" style={s.finder}>
                <DesignIcon asset={assets.imgViewfinder} />
                <Text style={s.live}>Live camera</Text>
              </View>
            </>
          ) : (
            <View style={s.cameraMessage}>
              <Text style={s.cameraTitle}>Ready when you are</Text>
              <Text style={s.cameraText}>
                Allow camera access to scan a product barcode.
              </Text>
              <Button secondary onPress={() => void allowCamera()}>
                {permission.canAskAgain
                  ? "Allow Camera Access"
                  : "Open Device Settings"}
              </Button>
            </View>
          )}
        </View>
        <Text style={s.hint}>
          Align the barcode within the frame. The camera is only used for
          scanning; images are not saved or uploaded.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowManual((value) => !value)}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text style={s.manual}>Enter barcode manually</Text>
        </Pressable>
        {showManual ? (
          <View style={{ gap: 12 }}>
            <Field
              label="Barcode number"
              keyboardType="number-pad"
              value={manual}
              onChangeText={setManual}
              maxLength={14}
            />
            <Button onPress={() => lookup(manual.trim())}>Find Barcode</Button>
          </View>
        ) : null}
        {error ? <Message error>{error}</Message> : null}
      </ScrollView>
      <BottomTabs screen="3-433" />
    </Page>
  );
}
const s = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  camera: {
    height: 440,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: colors.charcoal,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraMessage: { padding: 24, gap: 18, alignItems: "center" },
  cameraTitle: {
    color: colors.cream,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  cameraText: { color: colors.pale, fontSize: 14, textAlign: "center" },
  finder: { alignItems: "center", gap: 24 },
  live: {
    color: colors.white,
    fontSize: 12,
    backgroundColor: "#43433BCC",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
  manual: {
    color: colors.green,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
