import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import {
  useFonts,
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from "@expo-google-fonts/geist";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { initialiseDatabase } from "../data/database";
import { Button, Message, Page } from "../components/ui";
import { colors } from "../constants/theme";

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaProvider>
      <Page>
        <Message error>
          MayRoar could not open this screen. Your saved data has not been
          cleared.
        </Message>
        <Button onPress={retry}>Try again</Button>
      </Page>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });
  const [databaseError, setDatabaseError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  if (!fontsLoaded && !fontError)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.cream,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.olive} />
      </View>
    );
  if (fontError) throw fontError;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {databaseError ? (
        <Page>
          <Message error>Could not open your local diary.</Message>
          <Button
            onPress={() => {
              setDatabaseError(false);
              setAttempt((value) => value + 1);
            }}
          >
            Try again
          </Button>
        </Page>
      ) : (
        <SQLiteProvider
          key={attempt}
          databaseName="mayroar.db"
          onInit={initialiseDatabase}
          onError={() => setDatabaseError(true)}
        >
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.cream },
            }}
          />
        </SQLiteProvider>
      )}
    </SafeAreaProvider>
  );
}
