"use client";

import { useActionState, type InputHTMLAttributes } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CircleAlert,
  LoaderCircle,
  Lock,
  Mail,
  User,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type AuthFormState = { error: string | null };
export type AuthFormMode = "login" | "signup";

export function authFormView(mode: AuthFormMode) {
  if (mode === "login") {
    return {
      title: "Entrar" as const,
      submitLabel: "Entrar" as const,
      showConfirm: false,
      showName: false,
      switchHref: "/cadastro" as const,
      switchLabel: "Não tem conta? Cadastre-se" as const,
    };
  }
  return {
    title: "Criar conta" as const,
    submitLabel: "Cadastrar" as const,
    showConfirm: true,
    showName: true,
    switchHref: "/login" as const,
    switchLabel: "Já tem conta? Entrar" as const,
  };
}

function Field({
  label,
  icon: Icon,
  ...input
}: {
  label: string;
  icon: LucideIcon;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <span className="relative block">
        <Icon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          {...input}
          className="h-11 w-full rounded-xl border border-input bg-card pr-3.5 pl-10 text-sm shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition-[border-color,box-shadow] outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20"
        />
      </span>
    </label>
  );
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
      {view.showName ? (
        <Field
          label="Nome"
          icon={User}
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Como devemos te chamar?"
          required
        />
      ) : null}
      <Field
        label="E-mail"
        icon={Mail}
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="voce@exemplo.com"
        required
      />
      <Field
        label="Senha"
        icon={Lock}
        id="password"
        name="password"
        type="password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        placeholder={mode === "login" ? "Sua senha" : "Pelo menos 8 caracteres"}
        required
        minLength={8}
      />
      {view.showConfirm ? (
        <Field
          label="Confirmar senha"
          icon={Lock}
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          placeholder="Repita a senha"
          required
          minLength={8}
        />
      ) : null}
      {state.error ? (
        <p
          className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive ring-1 ring-destructive/20 ring-inset"
          role="alert"
        >
          <CircleAlert aria-hidden className="size-4 shrink-0" />
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className={cn(
          "group mt-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-[0_8px_20px_-8px_var(--primary)] transition-all hover:brightness-110 focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-none active:translate-y-px disabled:pointer-events-none disabled:opacity-70",
        )}
      >
        {pending ? (
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
        ) : null}
        {view.submitLabel}
        {pending ? null : (
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform group-hover:translate-x-0.5"
          />
        )}
      </button>
      <p className="pt-2 text-center text-sm text-muted-foreground">
        <Link
          href={view.switchHref}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {view.switchLabel}
        </Link>
      </p>
    </form>
  );
}
