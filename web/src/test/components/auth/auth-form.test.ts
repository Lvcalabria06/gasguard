import { describe, expect, it } from "vitest";

import { authFormView } from "./auth-form";

describe("authFormView", () => {
  it("labels the login form in pt-BR", () => {
    expect(authFormView("login")).toEqual({
      title: "Entrar",
      submitLabel: "Entrar",
      showConfirm: false,
      switchHref: "/cadastro",
      switchLabel: "Não tem conta? Cadastre-se",
    });
  });

  it("labels the signup form in pt-BR", () => {
    expect(authFormView("signup")).toEqual({
      title: "Criar conta",
      submitLabel: "Cadastrar",
      showConfirm: true,
      switchHref: "/login",
      switchLabel: "Já tem conta? Entrar",
    });
  });
});
