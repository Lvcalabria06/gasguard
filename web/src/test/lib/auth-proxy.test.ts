import { describe, expect, it } from "vitest";

import { authProxyDecision } from "@/lib/auth-proxy";

describe("authProxyDecision", () => {
  it("sends guests on / to /login", () => {
    expect(authProxyDecision("/", false)).toEqual({ redirect: "/login" });
  });

  it("sends guests on /api/stream to /login", () => {
    expect(authProxyDecision("/api/stream", false)).toEqual({
      redirect: "/login",
    });
  });

  it("allows /login and /cadastro without a cookie", () => {
    expect(authProxyDecision("/login", false)).toBe("next");
    expect(authProxyDecision("/cadastro", false)).toBe("next");
  });

  it("always allows /api/auth/*", () => {
    expect(authProxyDecision("/api/auth/sign-in/email", false)).toBe("next");
    expect(authProxyDecision("/api/auth/get-session", true)).toBe("next");
  });

  it("allows protected routes when a cookie exists", () => {
    expect(authProxyDecision("/", true)).toBe("next");
    expect(authProxyDecision("/api/stream", true)).toBe("next");
  });

  it("lets auth pages through even with a cookie (pages validate the session)", () => {
    expect(authProxyDecision("/login", true)).toBe("next");
    expect(authProxyDecision("/cadastro", true)).toBe("next");
  });
});
