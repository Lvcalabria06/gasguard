import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getSession = vi.fn();

vi.mock("@/services/auth/auth", () => ({
  auth: { api: { getSession } },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

describe("getSessionUser", () => {
  beforeEach(() => {
    getSession.mockReset();
  });

  it("returns null when there is no session", async () => {
    getSession.mockResolvedValue(null);
    const { getSessionUser } = await import("@/services/auth/get-session");
    expect(await getSessionUser()).toBeNull();
  });

  it("returns name and email from the session user", async () => {
    getSession.mockResolvedValue({
      user: { name: "Ada", email: "ada@example.com" },
    });
    const { getSessionUser } = await import("@/services/auth/get-session");
    expect(await getSessionUser()).toEqual({
      name: "Ada",
      email: "ada@example.com",
    });
  });
});
