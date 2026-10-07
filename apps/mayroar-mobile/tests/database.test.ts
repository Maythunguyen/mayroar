// SQLite tests are replaced by API-client tests. Database isolation is tested in SQL.
import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient } from "../src/data/apiClient";

test("refreshes once for concurrent requests and forwards only the refreshed token", async () => {
  const original = globalThis.fetch;
  const calls: { path: string; token: string | null }[] = [];
  globalThis.fetch = async (input, init) => {
    const path = new URL(String(input)).pathname;
    calls.push({ path, token: new Headers(init?.headers).get("Authorization") });
    return Response.json(path === "/auth/login"
      ? { access_token: "expired", refresh_token: "refresh1", expires_in: 0 }
      : path === "/auth/refresh"
        ? { access_token: "fresh", refresh_token: "refresh2", expires_in: 3600 }
        : { ok: true });
  };
  try {
    const api = new ApiClient();
    await assert.rejects(api.request("/diary"), /Sign in/);
    await api.login("test@example.com", "password");
    await Promise.all([api.request("/diary"), api.request("/targets")]);
    assert.equal(calls.filter(x => x.path === "/auth/refresh").length, 1);
    assert.ok(calls.filter(x => ["/diary", "/targets"].includes(x.path)).every(x => x.token === "Bearer fresh"));
    await api.logout();
    assert.equal(api.isSignedIn(), false);
  } finally { globalThis.fetch = original; }
});

test("a refresh response cannot restore a session after sign-out", async () => {
  const original = globalThis.fetch;
  let finish: (value: Response) => void = () => {};
  let start: () => void = () => {};
  const started = new Promise<void>(resolve => { start = resolve; });
  globalThis.fetch = async (input) => {
    const path = new URL(String(input)).pathname;
    if (path === "/auth/login") return Response.json({ access_token: "old", refresh_token: "old-refresh", expires_in: 0 });
    if (path === "/auth/refresh") { start(); return new Promise<Response>(resolve => { finish = resolve; }); }
    return Response.json({ ok: true });
  };
  try {
    const api = new ApiClient();
    await api.login("test@example.com", "password");
    const pending = api.request("/diary");
    const rejected = assert.rejects(pending, /Session changed/);
    await started;
    await api.logout();
    finish(Response.json({ access_token: "late", refresh_token: "late-refresh", expires_in: 3600 }));
    await rejected;
    assert.equal(api.isSignedIn(), false);
  } finally { globalThis.fetch = original; }
});
