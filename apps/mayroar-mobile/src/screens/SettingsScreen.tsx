import { useRef, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useDatabase } from "../data/session";
import { deleteAccountDiary } from "../data/database";
import { Button, Header, Message, Page, ui } from "../components/ui";
import { Text } from "../components/Text";

export default function SettingsScreen() {
  const db = useDatabase();
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
      await deleteAccountDiary(db);
      router.dismissTo("/");
    } catch {
      setError("Could not clear your account diary. Please try again.");
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
        <Text style={ui.subheading}>Saved to your account</Text>
        <Message>
          Your diary, custom foods, favourites, and targets are stored in Supabase through the Python API.
        </Message>
        <Message>
          You need an internet connection to read and save data. Earlier device-only diary entries are not imported by this update.
        </Message>
        {confirm ? (
          <>
            <Message error>
              Delete every diary entry, custom food, favourite, and target in
              your account? This cannot be undone.
            </Message>
            <Button secondary busy={busy} onPress={() => void clear()}>
              Delete All Account Diary Data
            </Button>
            <Button secondary disabled={busy} onPress={() => setConfirm(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <Button secondary onPress={() => setConfirm(true)}>
            Clear Account Diary…
          </Button>
        )}
      </View>
      {error ? <Message error>{error}</Message> : null}
      <Button secondary disabled={busy} onPress={() => void db.logout().catch(() => {})}>Sign out</Button>
      <Message>MayRoar · Nutrition foundation · v0.1.0</Message>
    </Page>
  );
}
