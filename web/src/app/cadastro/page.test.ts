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

import { findUser } from "@/services/auth/users";
import { getSession } from "@/services/auth/session";
import { redirect } from "next/navigation";

import { signup } from "./page";
import SignupPage from "./page";

const originalUsers = process.env.AUTH_USERS_PATH;
const originalSecret = process.env.AUTH_SECRET;

let tmpDir: string;

function form(email: string, password: string, confirm: string): FormData {
  const data = new FormData();
  data.set("email", email);
  data.set("password", password);
  data.set("confirm", confirm);
  return data;
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "gasguard-signup-"));
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

describe("signup", () => {
  it("rejects a malformed email", async () => {
    await expect(
      signup({ error: null }, form("sem-arroba", "password1", "password1")),
    ).resolves.toEqual({ error: "Informe um e-mail válido." });
  });

  it("rejects a short password", async () => {
    await expect(
      signup({ error: null }, form("ada@example.com", "1234567", "1234567")),
    ).resolves.toEqual({
      error: "A senha precisa ter pelo menos 8 caracteres.",
    });
  });

  it("rejects when the passwords do not match", async () => {
    await expect(
      signup({ error: null }, form("ada@example.com", "password1", "password2")),
    ).resolves.toEqual({ error: "As senhas não coincidem." });
  });

  it("rejects a duplicate email", async () => {
    await signup({ error: null }, form("ada@example.com", "password1", "password1")).catch(
      () => {},
    );
    store.clear();

    await expect(
      signup({ error: null }, form("ada@example.com", "password1", "password1")),
    ).resolves.toEqual({ error: "E-mail já cadastrado." });
  });

  it("returns a config error when AUTH_SECRET is missing", async () => {
    delete process.env.AUTH_SECRET;

    await expect(
      signup({ error: null }, form("ada@example.com", "password1", "password1")),
    ).resolves.toEqual({
      error: "Configuração incompleta. Defina AUTH_SECRET.",
    });
    expect(findUser("ada@example.com")).toBeNull();
  });

  it("creates the user, sets the session and redirects home", async () => {
    await expect(
      signup({ error: null }, form("Ada@Example.COM", "password1", "password1")),
    ).rejects.toThrow("REDIRECT:/");
    expect(redirect).toHaveBeenCalledWith("/");
    expect(findUser("ada@example.com")?.email).toBe("ada@example.com");
    expect(await getSession()).toEqual({ email: "ada@example.com" });
  });
});

describe("SignupPage", () => {
  it("redirects home when a session already exists", async () => {
    await signup(
      { error: null },
      form("ada@example.com", "password1", "password1"),
    ).catch(() => {});

    await expect(SignupPage()).rejects.toThrow("REDIRECT:/");
  });
});
