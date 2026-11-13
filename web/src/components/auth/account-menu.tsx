import Link from "next/link";

export function accountMenuView(email: string | null) {
  if (email === null) {
    return {
      state: "guest" as const,
      loginHref: "/login" as const,
      loginLabel: "Entrar" as const,
      signupHref: "/cadastro" as const,
      signupLabel: "Cadastrar" as const,
    };
  }
  return {
    state: "signed-in" as const,
    email,
    logoutLabel: "Sair" as const,
    logoutAction: "/login/sair" as const,
  };
}

export function AccountMenu({ email }: { email: string | null }) {
  const view = accountMenuView(email);

  if (view.state === "guest") {
    return (
      <nav className="flex items-center justify-end gap-3 text-sm">
        <Link
          href={view.loginHref}
          className="text-muted-foreground underline-offset-4 hover:underline"
        >
          {view.loginLabel}
        </Link>
        <Link
          href={view.signupHref}
          className="font-medium underline-offset-4 hover:underline"
        >
          {view.signupLabel}
        </Link>
      </nav>
    );
  }

  return (
    <nav className="flex items-center justify-end gap-3 text-sm">
      <span className="truncate text-muted-foreground">{view.email}</span>
      <form action={view.logoutAction} method="post">
        <button
          type="submit"
          className="font-medium underline-offset-4 hover:underline"
        >
          {view.logoutLabel}
        </button>
      </form>
    </nav>
  );
}
