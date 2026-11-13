import { redirect } from "next/navigation";

import {
  AuthForm,
  type AuthFormState,
} from "@/components/auth/auth-form";
import { passwordError } from "@/services/auth/password";
import { getSession, setSession } from "@/services/auth/session";
import { createUser, parseEmail } from "@/services/auth/users";

const FOOTER =
  "Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado.";

export async function signup(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  "use server";

  const email = parseEmail(String(formData.get("email") ?? ""));
  if (email === null) {
    return { error: "Informe um e-mail válido." };
  }
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const passwordProblem = passwordError(password);
  if (passwordProblem) return { error: passwordProblem };
  if (password !== confirm) {
    return { error: "As senhas não coincidem." };
  }
  if (!process.env.AUTH_SECRET) {
    return { error: "Configuração incompleta. Defina AUTH_SECRET." };
  }
  if (createUser(email, password) === "duplicate") {
    return { error: "E-mail já cadastrado." };
  }
  await setSession(email);
  redirect("/");
}

export default async function SignupPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className="flex flex-1 flex-col justify-center gap-6 px-4 py-10">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">GasGuard</p>
          <h1 className="text-2xl font-semibold tracking-tight">Criar conta</h1>
        </div>
        <AuthForm mode="signup" action={signup} />
      </main>
      <footer className="px-4 pb-6 text-xs text-muted-foreground">{FOOTER}</footer>
    </div>
  );
}
