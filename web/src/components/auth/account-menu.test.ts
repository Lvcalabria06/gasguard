import { describe, expect, it } from "vitest";

import { accountMenuView } from "./account-menu";

describe("accountMenuView", () => {
  it("points guests to login and signup", () => {
    expect(accountMenuView(null)).toEqual({
      state: "guest",
      loginHref: "/login",
      loginLabel: "Entrar",
      signupHref: "/cadastro",
      signupLabel: "Cadastrar",
    });
  });

  it("shows the email and posts logout to /login/sair", () => {
    expect(accountMenuView("ada@example.com")).toEqual({
      state: "signed-in",
      email: "ada@example.com",
      logoutLabel: "Sair",
      logoutAction: "/login/sair",
    });
  });
});
