// All network calls from the app go to Python. Credentials stay in memory.
export const apiUrl = (process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:8787").replace(/\/+$/, "");

type Session = { access_token: string; refresh_token: string; expires_in: number; expiresAt: number };

export class ApiClient {
  private session: Session | null = null;
  private refresh: Promise<void> | null = null;
  private generation = 0;
  private listeners = new Set<() => void>();
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  isSignedIn = () => this.session !== null;
  private emit() { this.listeners.forEach(listener => listener()); }
  private setSession(data: Omit<Session, "expiresAt">) {
    if (!data.access_token || !data.refresh_token || !Number.isFinite(data.expires_in)) throw new Error("Invalid sign-in response.");
    this.session = { ...data, expiresAt: Date.now() + data.expires_in * 1000 };
  }
  private async send<T>(path: string, init: RequestInit, token?: string): Promise<T> {
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), path === "/analyse-food" ? 70000 : 25000);
    const abort = () => timeout.abort();
    init.signal?.addEventListener("abort", abort, { once: true });
    if (init.signal?.aborted) timeout.abort();
    try {
      const response = await fetch(`${apiUrl}${path}`, { ...init, signal: timeout.signal,
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } });
      const data = await response.json();
      if (!response.ok) {
        const message =
          typeof data?.error === "string"
            ? data.error
            : typeof data?.detail === "string"
              ? data.detail
              : "The server could not complete this request.";

        console.error("API request failed", {
          path,
          status: response.status,
          message,
        });

        throw new Error(message);
      }
      return data as T;
    } catch (error) {
      if (timeout.signal.aborted) throw new Error("Request cancelled or timed out. Please try again.");
      if (error instanceof TypeError) throw new Error("Cannot reach MayRoar API. Check the server and API URL.");
      throw error;
    } finally { clearTimeout(timer); init.signal?.removeEventListener("abort", abort); }
  }
  async login(email: string, password: string) {
    const generation = ++this.generation;
    const data = await this.send<Omit<Session, "expiresAt">>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    if (generation !== this.generation) return;
    this.setSession(data); this.emit();
  }
  async signup(email: string, password: string): Promise<boolean> {
    const generation = ++this.generation;
    const data = await this.send<{
      requires_confirmation: boolean;
      session: Omit<Session, "expiresAt"> | null;
    }>("/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) });
    if (generation !== this.generation) throw new Error("Session changed. Please try again.");
    if (data.session) { this.setSession(data.session); this.emit(); return true; }
    return false;
  }
  async logout() {
    const token = this.session?.access_token;
    this.session = null; this.generation++; this.refresh = null; this.emit();
    if (token) await this.send("/auth/logout", { method: "POST" }, token);
  }
  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (!this.session) throw new Error("Sign in to continue.");
    const generation = this.generation;
    if (this.session.expiresAt < Date.now() + 60000) {
      if (!this.refresh) {
        const refreshToken = this.session.refresh_token;
        this.refresh = this.send<Omit<Session, "expiresAt">>("/auth/refresh", {
          method: "POST", body: JSON.stringify({ refresh_token: refreshToken }),
        }).then(data => { if (generation === this.generation) this.setSession(data); })
          .catch(error => { if (generation === this.generation) { this.session = null; this.emit(); } throw error; })
          .finally(() => { if (generation === this.generation) this.refresh = null; });
      }
      await this.refresh;
    }
    if (generation !== this.generation || !this.session) throw new Error("Session changed. Sign in again.");
    const result = await this.send<T>(path, init, this.session.access_token);
    if (generation !== this.generation) throw new Error("Session changed.");
    return result;
  }
}
export const api = new ApiClient();
