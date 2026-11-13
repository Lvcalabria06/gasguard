import { getScenario } from "@/lib/scenarios";
import { cn } from "@/lib/utils";
import type { ConnectionStatus, Reading, RiskLevel } from "@/types";

type Tone = {
  surfaceClass: string;
  textClass: string;
  pulse: boolean;
  alternate: boolean;
};

const TONE: Record<RiskLevel, Tone> = {
  NORMAL: {
    surfaceClass: "bg-emerald-600",
    textClass: "text-white",
    pulse: false,
    alternate: false,
  },
  ATTENTION: {
    surfaceClass: "bg-amber-400",
    textClass: "text-zinc-950",
    pulse: false,
    alternate: false,
  },
  ALERT: {
    surfaceClass: "bg-orange-500",
    textClass: "text-white",
    pulse: true,
    alternate: false,
  },
  HIGH: {
    surfaceClass: "bg-red-600",
    textClass: "text-white",
    pulse: true,
    alternate: false,
  },
  CRITICAL: {
    surfaceClass: "bg-red-900",
    textClass: "text-white",
    pulse: true,
    alternate: true,
  },
  FAILURE: {
    surfaceClass: "bg-zinc-500",
    textClass: "text-white",
    pulse: false,
    alternate: false,
  },
};

const NO_DATA_VIEW = {
  title: "Sem dados",
  guidance: "—",
  surfaceClass: "bg-zinc-500",
  textClass: "text-white",
  pulse: false,
  alternate: false,
  simulation: false,
} as const;

export function riskView(
  reading: Reading | null,
  connection: ConnectionStatus,
) {
  if (connection === "no_data" || reading === null) {
    return { ...NO_DATA_VIEW };
  }

  const scenario = getScenario(reading.scenarioId);
  const tone = TONE[reading.level];
  return {
    title: scenario.title,
    guidance: scenario.guidance,
    surfaceClass: tone.surfaceClass,
    textClass: tone.textClass,
    pulse: tone.pulse,
    alternate: tone.alternate,
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

  return (
    <article
      aria-live="polite"
      className={cn(
        "relative overflow-hidden rounded-2xl p-5 shadow-sm",
        view.surfaceClass,
        view.textClass,
        view.pulse && !view.alternate && "animate-pulse",
      )}
    >
      {view.alternate ? (
        <div
          aria-hidden
          className="absolute inset-0 animate-pulse bg-orange-500"
        />
      ) : null}
      <div className="relative space-y-2">
        {view.simulation ? (
          <span className="inline-flex rounded-full border border-current/40 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wider">
            SIMULAÇÃO
          </span>
        ) : null}
        <h2 className="text-lg font-semibold leading-snug">{view.title}</h2>
        <p className="text-sm/6 opacity-90">{view.guidance}</p>
      </div>
    </article>
  );
}
