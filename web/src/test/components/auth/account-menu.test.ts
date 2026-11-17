import { describe, expect, it } from "vitest";

import { accountMenuView, initialsOf } from "@/components/auth/account-menu";

describe("accountMenuView", () => {
  it("shows name, email and logout label", () => {
    expect(
      accountMenuView({ name: "Ada", email: "ada@example.com" }),
    ).toEqual({
      name: "Ada",
      email: "ada@example.com",
      logoutLabel: "Sair",
    });
  });
});

describe("initialsOf", () => {
  it("uses the first and last initials, uppercase", () => {
    expect(initialsOf("Ada Lovelace")).toBe("AL");
    expect(initialsOf("  maria  da silva ")).toBe("MS");
    expect(initialsOf("Teste")).toBe("T");
    expect(initialsOf("   ")).toBe("?");
  });
});
