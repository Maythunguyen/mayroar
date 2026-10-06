import { useRef, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { deleteLocalData } from "../data/database";
import { Button, Header, Message, Page, ui } from "../components/ui";
import { Text } from "../components/Text";

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const deleting = useRef(false);
  async function clear() {
    if (deleting.current) return;
    deleting.current = true;
    setBusy(true);
    setError("");
    try {
      await deleteLocalData(db);
      router.dismissTo("/");
    } catch {
      setError("Could not clear all local data. Please try again.");
    } finally {
      deleting.current = false;
      setBusy(false);
    }
  }
  return (
    <Page>
      <Header title="Your Settings" />
      <View style={ui.card}>
        <Text style={ui.subheading}>Make it your day</Text>
        <Button onPress={() => router.push("/targets")}>
          Adjust Daily Targets
        </Button>
      </View>
      <View style={ui.card}>
        <Text style={ui.subheading}>Saved on this device</Text>
        <Message>
          Your diary, custom foods, favourites, and targets stay on this device.
          Online searches send your search words or barcode to the food
          catalogue.
        </Message>
        <Message>
          There is no account or diary sync in this version. Removing the app
          can remove your diary. Device backups may retain copies.
        </Message>
        {confirm ? (
          <>
            <Message error>
              Delete every diary entry, custom food, favourite, and target on
              this device? This cannot be undone.
            </Message>
            <Button secondary busy={busy} onPress={() => void clear()}>
              Delete All Local Data
            </Button>
            <Button secondary disabled={busy} onPress={() => setConfirm(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <Button secondary onPress={() => setConfirm(true)}>
            Clear Local Data…
          </Button>
        )}
      </View>
      {error ? <Message error>{error}</Message> : null}
      <Message>MayRoar · Nutrition foundation · v0.1.0</Message>
    </Page>
  );
}
