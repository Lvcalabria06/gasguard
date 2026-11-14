import { describe, expect, it } from "vitest";

import { accountMenuView } from "@/components/auth/account-menu";

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
