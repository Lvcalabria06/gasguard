"use client";

import { useActionState } from "react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AuthFormState = { error: string | null };
export type AuthFormMode = "login" | "signup";

const INPUT_CLASS =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function authFormView(mode: AuthFormMode) {
  if (mode === "login") {
    return {
      title: "Entrar" as const,
      submitLabel: "Entrar" as const,
      showConfirm: false,
      switchHref: "/cadastro" as const,
      switchLabel: "Não tem conta? Cadastre-se" as const,
    };
  }
  return {
    title: "Criar conta" as const,
    submitLabel: "Cadastrar" as const,
    showConfirm: true,
    switchHref: "/login" as const,
    switchLabel: "Já tem conta? Entrar" as const,
  };
}

export function AuthForm({
  mode,
  action,
}: {
  mode: AuthFormMode;
  action: (
    state: AuthFormState,
    formData: FormData,
  ) => Promise<AuthFormState>;
}) {
  const view = authFormView(mode);
  const [state, formAction, pending] = useActionState(action, {
    error: null,
  });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">E-mail</span>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={INPUT_CLASS}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Senha</span>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={8}
          className={INPUT_CLASS}
        />
      </label>
      {view.showConfirm ? (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Confirmar senha</span>
          <input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className={INPUT_CLASS}
          />
        </label>
      ) : null}
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className={cn(buttonVariants({ size: "lg" }), "w-full")}
      >
        {view.submitLabel}
      </button>
      <p className="text-center text-sm text-muted-foreground">
        <Link href={view.switchHref} className="underline-offset-4 hover:underline">
          {view.switchLabel}
        </Link>
      </p>
    </form>
  );
}
