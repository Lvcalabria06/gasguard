import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { signUpEmail, getSessionUser } = vi.hoisted(() => ({
  signUpEmail: vi.fn(),
  getSessionUser: vi.fn(),
}));

vi.mock("@/services/auth/auth", () => ({
  auth: { api: { signUpEmail } },
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

import { signup } from "@/app/cadastro/page";
import SignupPage from "@/app/cadastro/page";

function form(
  name: string,
  email: string,
  password: string,
  confirm: string,
): FormData {
  const data = new FormData();
  data.set("name", name);
  data.set("email", email);
  data.set("password", password);
  data.set("confirm", confirm);
  return data;
}

beforeEach(() => {
  signUpEmail.mockReset();
  getSessionUser.mockReset();
  vi.mocked(redirect).mockClear();
});

describe("signup", () => {
  it("rejects an empty name", async () => {
    await expect(
      signup({ error: null }, form("  ", "ada@example.com", "password1", "password1")),
    ).resolves.toEqual({ error: "Informe o seu nome." });
    expect(signUpEmail).not.toHaveBeenCalled();
  });

  it("rejects a malformed email", async () => {
    await expect(
      signup({ error: null }, form("Ada", "sem-arroba", "password1", "password1")),
    ).resolves.toEqual({ error: "Informe um e-mail válido." });
  });

  it("rejects a short password", async () => {
    await expect(
      signup({ error: null }, form("Ada", "ada@example.com", "1234567", "1234567")),
    ).resolves.toEqual({
      error: "A senha deve ter pelo menos 8 caracteres.",
    });
  });

  it("rejects when the passwords do not match", async () => {
    await expect(
      signup(
        { error: null },
        form("Ada", "ada@example.com", "password1", "password2"),
      ),
    ).resolves.toEqual({ error: "As senhas não coincidem." });
  });

  it("returns an error when the API fails", async () => {
    signUpEmail.mockRejectedValue(new Error("duplicate"));
    await expect(
      signup(
        { error: null },
        form("Ada", "ada@example.com", "password1", "password1"),
      ),
    ).resolves.toEqual({ error: "E-mail já cadastrado." });
  });

  it("calls signUpEmail and redirects home", async () => {
    signUpEmail.mockResolvedValue({});
    await expect(
      signup(
        { error: null },
        form("Ada", "Ada@Example.COM", "password1", "password1"),
      ),
    ).rejects.toThrow("REDIRECT:/");
    expect(signUpEmail).toHaveBeenCalledWith({
      body: { email: "ada@example.com", password: "password1", name: "Ada" },
      headers: expect.any(Headers),
    });
    expect(redirect).toHaveBeenCalledWith("/");
  });
});

describe("SignupPage", () => {
  it("redirects home when a session already exists", async () => {
    getSessionUser.mockResolvedValue({
      name: "Ada",
      email: "ada@example.com",
    });
    await expect(SignupPage()).rejects.toThrow("REDIRECT:/");
  });
});
