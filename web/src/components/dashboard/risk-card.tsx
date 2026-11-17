import type { CSSProperties } from "react";
import { CloudOff, Lightbulb } from "lucide-react";

import { getScenario } from "@/lib/scenarios";
import { cn } from "@/lib/utils";
import type { ConnectionStatus, Reading, RiskLevel } from "@/types";

import { LEVEL_THEME } from "./level-theme";

const NO_GUIDANCE = "—";

const NO_DATA_VIEW = {
  level: null,
  heading: "Sem dados",
  title: "Sem dados",
  guidance:
    "Nenhuma leitura nova há mais de 5 s. Confira se a placa ou o simulador está gravando o relatório.",
  surfaceClass: "bg-gradient-to-br from-slate-400 to-slate-500",
  textClass: "text-white",
  halo: "oklch(0.6 0.02 260)",
  pulse: false,
  alternate: false,
  simulation: false,
} as const;

export type RiskView = {
  level: RiskLevel | null;
  heading: string;
  title: string;
  /** null when the scenario has no guidance (e.g. "Ambiente normal"). */
  guidance: string | null;
  surfaceClass: string;
  textClass: string;
  halo: string;
  pulse: boolean;
  alternate: boolean;
  simulation: boolean;
};

export function riskView(
  reading: Reading | null,
  connection: ConnectionStatus,
): RiskView {
  if (connection === "no_data" || reading === null) {
    return { ...NO_DATA_VIEW };
  }

  const scenario = getScenario(reading.scenarioId);
  const theme = LEVEL_THEME[reading.level];
  return {
    level: reading.level,
    heading: theme.heading,
    title: scenario.title,
    guidance: scenario.guidance === NO_GUIDANCE ? null : scenario.guidance,
    surfaceClass: theme.surfaceClass,
    textClass: theme.textClass,
    halo: theme.halo,
    pulse: theme.pulse,
    alternate: theme.alternate,
    simulation: reading.source === "mock",
  };
}

export function RiskCard({
  reading,
  connection,
}: {
  reading: Reading | null;
  connection: ConnectionStatus;
}) {
  const view = riskView(reading, connection);
  const Icon = view.level ? LEVEL_THEME[view.level].icon : CloudOff;
  const darkText = view.textClass !== "text-white";

  return (
    <article
      aria-live="polite"
      aria-label={`Nível de risco: ${view.heading}`}
      style={{ "--halo": view.halo } as CSSProperties}
      className={cn(
        "relative isolate overflow-hidden rounded-[1.75rem] p-6 shadow-[0_18px_40px_-18px_var(--halo)] transition-colors duration-500 sm:p-7",
        view.surfaceClass,
        view.textClass,
        view.pulse && "animate-halo",
      )}
    >
      {view.alternate ? (
        <div
          aria-hidden
          className="absolute inset-0 -z-10 animate-alarm bg-gradient-to-br from-orange-500 to-red-600"
        />
      ) : null}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_0%_0%,rgb(255_255_255/0.28),transparent_60%)]"
      />
      <Icon
        aria-hidden
        strokeWidth={1.25}
        className={cn(
          "absolute -right-10 -bottom-12 -z-10 size-52",
          darkText ? "opacity-[0.06]" : "opacity-10",
        )}
      />

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-[0.12em] uppercase backdrop-blur-sm",
            darkText ? "bg-black/10" : "bg-white/18",
          )}
        >
          <Icon aria-hidden className="size-3.5" strokeWidth={2.25} />
          {view.heading}
        </span>
        {view.simulation ? (
          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[0.65rem] font-semibold tracking-[0.16em] uppercase ring-1 ring-current/35 ring-inset">
            Simulação
          </span>
        ) : null}
      </div>

      <h2 className="mt-5 max-w-[28ch] text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-[1.7rem]">
        {view.title}
      </h2>

      {view.guidance ? (
        <p
          className={cn(
            "mt-5 flex gap-2.5 rounded-2xl p-3.5 text-sm/6 backdrop-blur-sm",
            darkText ? "bg-black/8" : "bg-black/15",
          )}
        >
          <Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0 opacity-80" />
          <span>{view.guidance}</span>
        </p>
      ) : null}
    </article>
  );
}
