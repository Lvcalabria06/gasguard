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

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { SESSION_COOKIE, setSession } from "@/services/auth/session";
import { redirect } from "next/navigation";

import { POST } from "./route";

beforeEach(async () => {
  store.clear();
  process.env.AUTH_SECRET = "test-auth-secret";
  vi.mocked(redirect).mockClear();
  await setSession("ada@example.com");
});

describe("POST /login/sair", () => {
  it("clears the session cookie and redirects home", async () => {
    expect(store.has(SESSION_COOKIE)).toBe(true);

    await expect(POST()).rejects.toThrow("REDIRECT:/");
    expect(redirect).toHaveBeenCalledWith("/");
    expect(store.has(SESSION_COOKIE)).toBe(false);
  });
});
