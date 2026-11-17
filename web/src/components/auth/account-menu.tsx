import { LogOut } from "lucide-react";

export function accountMenuView(user: { name: string; email: string }) {
  return {
    name: user.name,
    email: user.email,
    logoutLabel: "Sair" as const,
  };
}

/** Up to two initials for the avatar ("Ada Lovelace" → "AL"). */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
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
    <div className="flex shrink-0 items-center gap-2.5">
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-[0.6875rem] font-semibold text-white ring-2 ring-background dark:from-slate-300 dark:to-slate-400 dark:text-slate-900"
      >
        {initialsOf(view.name)}
      </span>
      <div className="hidden max-w-44 min-w-0 leading-tight md:block">
        <p className="truncate text-sm font-medium">{view.name}</p>
        <p className="truncate text-xs text-muted-foreground">{view.email}</p>
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          title={view.logoutLabel}
          className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <LogOut aria-hidden className="size-4" />
          <span className="max-sm:sr-only">{view.logoutLabel}</span>
        </button>
      </form>
    </div>
  );
}
