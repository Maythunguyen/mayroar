import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { api } from "../data/apiClient";
import { Button, Field, Message, Page } from "../components/ui";
import { Text } from "../components/Text";

export default function SignInScreen() {
  const [callback] = useState(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return null;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.has("error") || hash.has("error_code")) return "error";
    return hash.has("access_token") ? "confirmed" : null;
  });
  const [mode, setMode] = useState<"signup" | "signin">(callback ? "signin" : "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(callback === "error" ? "This confirmation link is invalid or expired. Try creating your account again to request another email." : "");
  const [message, setMessage] = useState(callback === "confirmed" ? "Email confirmation complete. Sign in to open your diary." : "");
  const lock = useRef(false);
  const creating = mode === "signup";

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    // Email verification occurs at Supabase. Sign in explicitly afterwards.
    // Discard callback tokens from the address bar; never store or log them.
    if (hash.has("access_token") || hash.has("error_code") || hash.has("error")) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);

    }
  }, []);

  function switchMode() {
    if (lock.current) return;
    setMode(creating ? "signin" : "signup");
    setPassword(""); setConfirmPassword(""); setError(""); setMessage("");
  }

  async function submit() {
    if (lock.current) return;
    setError(""); setMessage("");
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError("Enter a valid email address."); return;
    }
    if (creating && password.length < 8) {
      setError("Use at least 8 characters for your password."); return;
    }
    if (creating && password !== confirmPassword) {
      setError("Your passwords do not match."); return;
    }
    lock.current = true; setBusy(true);
    try {
      if (creating) {
        const signedIn = await api.signup(address, password);
        if (!signedIn) {
          setMode("signin"); setPassword(""); setConfirmPassword("");
          setMessage("Check your inbox and spam folder for a confirmation email. Confirm your email, then return here to sign in. If you already have an account, sign in with it.");
        }
      } else {
        await api.login(address, password);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not complete your request.");
    } finally {
      lock.current = false; setBusy(false);
    }
  }

  return <Page>
    <Text accessibilityRole="header" style={{ fontSize: 28, fontWeight: "600" }}>
      {creating ? "Create your MayRoar account" : "Welcome back"}
    </Text>
    <Message>{creating ? "Start your nutrition diary." : "Sign in to access your nutrition diary."}</Message>
    <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none"
      autoCorrect={false} keyboardType="email-address" autoComplete="email" editable={!busy} />
    <Field label={creating ? "Password (at least 8 characters)" : "Password"}
      value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none"
      autoCorrect={false} autoComplete={creating ? "new-password" : "current-password"} editable={!busy} />
    {creating ? <Field label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword}
      secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" editable={!busy} /> : null}
    {message ? <Message>{message}</Message> : null}
    {error ? <Message error>{error}</Message> : null}
    <Button busy={busy} disabled={!email.trim() || !password || (creating && !confirmPassword)} onPress={() => void submit()}>
      {creating ? "Create account" : "Sign in"}
    </Button>
    <Button secondary disabled={busy} onPress={switchMode}>
      {creating ? "Already have an account? Sign in" : "New to MayRoar? Create account"}
    </Button>
  </Page>;
}
