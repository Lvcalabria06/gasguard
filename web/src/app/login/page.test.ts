import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import { createUser } from "@/services/auth/users";
import { getSession } from "@/services/auth/session";
import { redirect } from "next/navigation";

import { login } from "./page";
import LoginPage from "./page";

const originalUsers = process.env.AUTH_USERS_PATH;
const originalSecret = process.env.AUTH_SECRET;

let tmpDir: string;

function form(email: string, password: string): FormData {
  const data = new FormData();
  data.set("email", email);
  data.set("password", password);
  return data;
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "gasguard-login-"));
  process.env.AUTH_USERS_PATH = join(tmpDir, "users.json");
  process.env.AUTH_SECRET = "test-auth-secret";
  store.clear();
  vi.mocked(redirect).mockClear();
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
  if (originalUsers === undefined) delete process.env.AUTH_USERS_PATH;
  else process.env.AUTH_USERS_PATH = originalUsers;
  if (originalSecret === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = originalSecret;
});

describe("login", () => {
  it("rejects a malformed email", async () => {
    await expect(login({ error: null }, form("sem-arroba", "password1"))).resolves.toEqual({
      error: "Informe um e-mail válido.",
    });
  });

  it("hides whether the email exists", async () => {
    createUser("ada@example.com", "password1");

    await expect(
      login({ error: null }, form("ada@example.com", "wrong-password")),
    ).resolves.toEqual({ error: "E-mail ou senha inválidos." });
    await expect(
      login({ error: null }, form("nobody@example.com", "password1")),
    ).resolves.toEqual({ error: "E-mail ou senha inválidos." });
  });

  it("returns a config error when AUTH_SECRET is missing", async () => {
    delete process.env.AUTH_SECRET;
    createUser("ada@example.com", "password1");

    await expect(
      login({ error: null }, form("ada@example.com", "password1")),
    ).resolves.toEqual({
      error: "Configuração incompleta. Defina AUTH_SECRET.",
    });
    expect(store.size).toBe(0);
  });

  it("sets the session and redirects home", async () => {
    createUser("ada@example.com", "password1");

    await expect(
      login({ error: null }, form("Ada@Example.COM", "password1")),
    ).rejects.toThrow("REDIRECT:/");
    expect(redirect).toHaveBeenCalledWith("/");
    expect(await getSession()).toEqual({ email: "ada@example.com" });
  });
});

describe("LoginPage", () => {
  it("redirects home when a session already exists", async () => {
    createUser("ada@example.com", "password1");
    await login({ error: null }, form("ada@example.com", "password1")).catch(
      () => {},
    );

    await expect(LoginPage()).rejects.toThrow("REDIRECT:/");
  });
});
