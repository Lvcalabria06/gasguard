import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const store = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = store.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string) => {
      store.set(name, value);
    },
    delete: (name: string) => {
      store.delete(name);
    },
  }),
}));

import {
  SESSION_COOKIE,
  clearSession,
  getSession,
  setSession,
  signSession,
  verifySession,
} from "./session";

const SECRET = "test-auth-secret";

beforeEach(() => {
  store.clear();
  process.env.AUTH_SECRET = SECRET;
  process.env.NODE_ENV = "test";
});

describe("signSession / verifySession", () => {
  it("round-trips the email and rejects a tampered token", () => {
    const token = signSession("ada@example.com", SECRET);

    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(verifySession(token, SECRET)).toEqual({ email: "ada@example.com" });
    expect(verifySession(token.slice(0, -1) + "x", SECRET)).toBeNull();
    expect(verifySession("not-a-token", SECRET)).toBeNull();
    expect(verifySession(token, "other-secret")).toBeNull();
  });
});

describe("getSession / setSession / clearSession", () => {
  it("returns null when AUTH_SECRET is missing", async () => {
    delete process.env.AUTH_SECRET;
    store.set(SESSION_COOKIE, signSession("ada@example.com", SECRET));

    expect(await getSession()).toBeNull();
  });

  it("returns null when the cookie is missing or tampered", async () => {
    expect(await getSession()).toBeNull();
    store.set(SESSION_COOKIE, "aaa.bbb");
    expect(await getSession()).toBeNull();
  });

  it("sets an httpOnly session cookie and clears it", async () => {
    await setSession("ada@example.com");

    expect(store.get(SESSION_COOKIE)).toBe(
      signSession("ada@example.com", SECRET),
    );
    expect(await getSession()).toEqual({ email: "ada@example.com" });

    await clearSession();
    expect(store.has(SESSION_COOKIE)).toBe(false);
    expect(await getSession()).toBeNull();
  });

  it("does not set a cookie when AUTH_SECRET is missing", async () => {
    delete process.env.AUTH_SECRET;
    await expect(setSession("ada@example.com")).rejects.toThrow(
      "AUTH_SECRET missing",
    );
    expect(store.size).toBe(0);
  });
});
