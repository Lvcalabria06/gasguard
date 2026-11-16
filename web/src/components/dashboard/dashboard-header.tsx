import { cn } from "@/lib/utils";
import type { ConnectionStatus } from "@/types";

const STATUS: Record<
  ConnectionStatus,
  { statusLabel: string; dotClass: string }
> = {
  live: { statusLabel: "Ao vivo", dotClass: "bg-emerald-500" },
  reconnecting: { statusLabel: "Reconectando", dotClass: "bg-amber-400" },
  no_data: { statusLabel: "Sem dados", dotClass: "bg-zinc-400" },
};

export function headerView(
  connection: ConnectionStatus,
  secondsSinceLast: number | null,
) {
  const { statusLabel, dotClass } = STATUS[connection];
  return {
    title: "GasGuard" as const,
    statusLabel,
    dotClass,
    ageLabel: secondsSinceLast === null ? null : `há ${secondsSinceLast} s`,
  };
}

export function DashboardHeader({
  connection,
  secondsSinceLast,
}: {
  connection: ConnectionStatus;
  secondsSinceLast: number | null;
}) {
  const view = headerView(connection, secondsSinceLast);

  return (
    <header className="flex items-baseline justify-between gap-3">
      <h1 className="text-xl font-semibold tracking-tight">{view.title}</h1>
      <p className="flex items-center gap-2 text-sm">
        <span
          aria-hidden
          className={cn("size-2 shrink-0 rounded-full", view.dotClass)}
        />
        <span>{view.statusLabel}</span>
        {view.ageLabel ? (
          <span className="text-muted-foreground">{view.ageLabel}</span>
        ) : null}
      </p>
    </header>
  );
}
