import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  hashPassword,
  passwordError,
  verifyPassword,
} from "./password";

describe("passwordError", () => {
  it("rejects passwords shorter than 8 characters", () => {
    expect(passwordError("")).toBe(
      "A senha precisa ter pelo menos 8 caracteres.",
    );
    expect(passwordError("1234567")).toBe(
      "A senha precisa ter pelo menos 8 caracteres.",
    );
  });

  it("accepts passwords with 8 or more characters", () => {
    expect(passwordError("12345678")).toBeNull();
    expect(passwordError("password1")).toBeNull();
  });
});

describe("hashPassword / verifyPassword", () => {
  it("round-trips a password and rejects a wrong one", () => {
    const stored = hashPassword("password1");

    expect(stored).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
    expect(verifyPassword("password1", stored)).toBe(true);
    expect(verifyPassword("password2", stored)).toBe(false);
  });

  it("uses a new salt every time", () => {
    expect(hashPassword("password1")).not.toBe(hashPassword("password1"));
  });

  it("returns false for a malformed stored hash instead of throwing", () => {
    expect(verifyPassword("password1", "not-a-hash")).toBe(false);
    expect(verifyPassword("password1", "aa:bb")).toBe(false);
    expect(verifyPassword("password1", "")).toBe(false);
  });
});
