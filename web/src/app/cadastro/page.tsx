import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  AuthForm,
  type AuthFormState,
} from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { parseEmail } from "@/lib/parse-email";
import { signupErrorMessage } from "@/lib/signup-error";
import { auth } from "@/services/auth/auth";
import { getSessionUser } from "@/services/auth/get-session";


export async function signup(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  "use server";

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Informe o seu nome." };
  }
  const email = parseEmail(String(formData.get("email") ?? ""));
  if (email === null) {
    return { error: "Informe um e-mail válido." };
  }
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) {
    return { error: "A senha deve ter pelo menos 8 caracteres." };
  }
  if (password !== confirm) {
    return { error: "As senhas não coincidem." };
  }
  try {
    await auth.api.signUpEmail({
      body: { email, password, name },
      headers: await headers(),
    });
  } catch (error) {
    console.error("[auth] signup failed", error);
    return { error: signupErrorMessage(error) };
  }
  redirect("/");
}

export default async function SignupPage() {
  const user = await getSessionUser();
  if (user) redirect("/");

  return (
    <AuthShell
      title="Criar conta"
      description="Cadastre-se para ver o painel e receber os alertas por e-mail."
    >
      <AuthForm mode="signup" action={signup} />
    </AuthShell>
  );
}
