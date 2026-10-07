import { useSyncExternalStore, type ReactNode } from "react";
import { api } from "./apiClient";
import SignInScreen from "../screens/SignInScreen";

export function SessionGate({ children }: { children: ReactNode }) {
  const signedIn = useSyncExternalStore(api.subscribe, api.isSignedIn, () => false);
  return signedIn ? <>{children}</> : <SignInScreen />;
}
export function useDatabase() { return api; }
