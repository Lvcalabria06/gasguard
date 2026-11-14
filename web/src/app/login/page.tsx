import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  AuthForm,
  type AuthFormState,
} from "@/components/auth/auth-form";
import { parseEmail } from "@/lib/parse-email";
import { auth } from "@/services/auth/auth";
import { getSessionUser } from "@/services/auth/get-session";

const FOOTER =
  "Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado.";

export async function login(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  "use server";

  const email = parseEmail(String(formData.get("email") ?? ""));
  if (email === null) {
    return { error: "Informe um e-mail válido." };
  }
  const password = String(formData.get("password") ?? "");
  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
  } catch {
    return { error: "E-mail ou senha inválidos." };
  }
  redirect("/");
}

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className="flex flex-1 flex-col justify-center gap-6 px-4 py-10">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">GasGuard</p>
          <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
        </div>
        <AuthForm mode="login" action={login} />
      </main>
      <footer className="px-4 pb-6 text-xs text-muted-foreground">{FOOTER}</footer>
    </div>
  );
}
