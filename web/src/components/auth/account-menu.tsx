export function accountMenuView(user: { name: string; email: string }) {
  return {
    name: user.name,
    email: user.email,
    logoutLabel: "Sair" as const,
  };
}

export function AccountMenu({
  user,
  signOutAction,
}: {
  user: { name: string; email: string };
  signOutAction: () => Promise<void>;
}) {
  const view = accountMenuView(user);

  return (
    <nav className="flex items-center justify-end gap-3 text-sm">
      <span className="truncate font-medium">{view.name}</span>
      <span className="truncate text-muted-foreground">{view.email}</span>
      <form action={signOutAction}>
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
