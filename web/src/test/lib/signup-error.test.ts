import { describe, expect, it } from "vitest";

import { signupErrorMessage } from "@/lib/signup-error";

describe("signupErrorMessage", () => {
  it("maps USER_ALREADY_EXISTS to a pt-BR duplicate message", () => {
    expect(
      signupErrorMessage({ body: { code: "USER_ALREADY_EXISTS" } }),
    ).toBe("E-mail já cadastrado.");
    expect(
      signupErrorMessage({
        body: { code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" },
      }),
    ).toBe("E-mail já cadastrado.");
  });

  it("returns a generic message for other errors", () => {
    expect(signupErrorMessage(new Error("no such table: user"))).toBe(
      "Não foi possível criar a conta.",
    );
    expect(signupErrorMessage(null)).toBe("Não foi possível criar a conta.");
  });
});
