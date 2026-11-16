import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { signInEmail, getSessionUser } = vi.hoisted(() => ({
  signInEmail: vi.fn(),
  getSessionUser: vi.fn(),
}));

vi.mock("@/services/auth/auth", () => ({
  auth: { api: { signInEmail } },
}));

vi.mock("@/services/auth/get-session", () => ({
  getSessionUser,
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { redirect } from "next/navigation";

import { login } from "@/app/login/page";
import LoginPage from "@/app/login/page";

function form(email: string, password: string): FormData {
  const data = new FormData();
  data.set("email", email);
  data.set("password", password);
  return data;
}

beforeEach(() => {
  signInEmail.mockReset();
  getSessionUser.mockReset();
  vi.mocked(redirect).mockClear();
});

describe("login", () => {
  it("rejects a malformed email", async () => {
    await expect(login({ error: null }, form("sem-arroba", "password1"))).resolves.toEqual({
      error: "Informe um e-mail válido.",
    });
    expect(signInEmail).not.toHaveBeenCalled();
  });

  it("returns an error when the API fails", async () => {
    signInEmail.mockRejectedValue(new Error("invalid"));
    await expect(
      login({ error: null }, form("ada@example.com", "wrong-password")),
    ).resolves.toEqual({ error: "E-mail ou senha inválidos." });
  });

  it("calls signInEmail and redirects home", async () => {
    signInEmail.mockResolvedValue({});
    await expect(
      login({ error: null }, form("Ada@Example.COM", "password1")),
    ).rejects.toThrow("REDIRECT:/");
    expect(signInEmail).toHaveBeenCalledWith({
      body: { email: "ada@example.com", password: "password1" },
      headers: expect.any(Headers),
    });
    expect(redirect).toHaveBeenCalledWith("/");
  });
});

describe("LoginPage", () => {
  it("redirects home when a session already exists", async () => {
    getSessionUser.mockResolvedValue({
      name: "Ada",
      email: "ada@example.com",
    });
    await expect(LoginPage()).rejects.toThrow("REDIRECT:/");
  });
});
