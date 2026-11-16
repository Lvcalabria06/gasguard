import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  AuthForm,
  type AuthFormState,
} from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { parseEmail } from "@/lib/parse-email";
import { auth } from "@/services/auth/auth";
import { getSessionUser } from "@/services/auth/get-session";


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
  } catch (error) {
    console.error("[auth] login failed", error);
    return { error: "E-mail ou senha inválidos." };
  }
  redirect("/");
}

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/");

  return (
    <AuthShell
      title="Entrar"
      description="Bem-vindo de volta. Acesse o painel de monitoramento."
    >
      <AuthForm mode="login" action={login} />
    </AuthShell>
  );
}
