import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";
import type { ConnectionStatus } from "@/types";

const STATUS: Record<
  ConnectionStatus,
  { statusLabel: string; dotClass: string; pillClass: string; beacon: boolean }
> = {
  live: {
    statusLabel: "Ao vivo",
    dotClass: "bg-emerald-500",
    pillClass: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
    beacon: true,
  },
  reconnecting: {
    statusLabel: "Reconectando",
    dotClass: "bg-amber-400",
    pillClass: "bg-amber-400/15 text-amber-800 ring-amber-500/30 dark:text-amber-300",
    beacon: false,
  },
  no_data: {
    statusLabel: "Sem dados",
    dotClass: "bg-zinc-400",
    pillClass: "bg-muted text-muted-foreground ring-border",
    beacon: false,
  },
};

export function headerView(
  connection: ConnectionStatus,
  secondsSinceLast: number | null,
) {
  const { statusLabel, dotClass, pillClass, beacon } = STATUS[connection];
  return {
    title: "GasGuard" as const,
    statusLabel,
    dotClass,
    pillClass,
    beacon,
    ageLabel: secondsSinceLast === null ? null : `há ${secondsSinceLast} s`,
  };
}

export function ConnectionPill({
  connection,
  secondsSinceLast,
}: {
  connection: ConnectionStatus;
  secondsSinceLast: number | null;
}) {
  const view = headerView(connection, secondsSinceLast);
  return (
    <p
      role="status"
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full py-1 pr-3 pl-2.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        view.pillClass,
      )}
    >
      <span aria-hidden className="relative flex size-2">
        {view.beacon ? (
          <span
            className={cn("absolute inline-flex size-full animate-beacon rounded-full opacity-75", view.dotClass)}
          />
        ) : null}
        <span className={cn("relative inline-flex size-2 rounded-full", view.dotClass)} />
      </span>
      <span>{view.statusLabel}</span>
      {view.ageLabel ? (
        // The age is computed with Date.now() on the server and again on hydration.
        <span className="font-normal tabular-nums opacity-70" suppressHydrationWarning>
          {view.ageLabel}
        </span>
      ) : null}
    </p>
  );
}

export function DashboardHeader({
  connection,
  secondsSinceLast,
}: {
  connection: ConnectionStatus;
  secondsSinceLast: number | null;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-5">
      <BrandMark subtitle="Monitor da cozinha" className="max-sm:[&>div]:sr-only" />
      <ConnectionPill connection={connection} secondsSinceLast={secondsSinceLast} />
    </div>
  );
}
