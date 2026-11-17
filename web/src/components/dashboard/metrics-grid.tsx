import {
  CookingPot,
  Flame,
  Footprints,
  Thermometer,
  Waves,
  Wind,
  type LucideIcon,
} from "lucide-react";

import { formatGasDelta, formatTemperature } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { GasLevel, Reading } from "@/types";

const DASH = "—";

const LABELS = {
  mq6: "GLP (MQ-6)",
  mq2: "Gases / fumaça (MQ-2)",
  flame: "Chama",
  temperature: "Temperatura",
  motion: "Movimento",
  stove: "Fogão",
} as const;

const ICONS: Record<MetricId, LucideIcon> = {
  mq6: Waves,
  mq2: Wind,
  flame: Flame,
  temperature: Thermometer,
  motion: Footprints,
  stove: CookingPot,
};

/** Gas level as reported by the firmware (mq*_nivel); the web does not recompute it. */
const GAS_STATUS: Record<GasLevel, string> = {
  0: "Normal",
  1: "Atenção",
  2: "Vazamento",
};

export type MetricId = keyof typeof LABELS;

/**
 * Visual emphasis of a tile. Only flags the firmware itself reports (gas level, temp_alta)
 * get warn/danger: judging flame or motion here would be a risk rule, and those belong to
 * the firmware (the risk card shows its verdict).
 */
export type MetricTone = "idle" | "active" | "warn" | "danger";

export type MetricItem = {
  id: MetricId;
  label: string;
  value: string;
  hint: string | null;
  tone: MetricTone;
  /** Gas sensors only: the firmware level (0, 1, 2) for the level meter. */
  gasLevel: GasLevel | null;
  /** Changes only on a meaningful state change; drives the "value changed" highlight. */
  flashKey: string;
};

const GAS_TONE: Record<GasLevel, MetricTone> = { 0: "idle", 1: "warn", 2: "danger" };

function emptyItem(id: MetricId): MetricItem {
  return {
    id,
    label: LABELS[id],
    value: DASH,
    hint: null,
    tone: "idle",
    gasLevel: null,
    flashKey: DASH,
  };
}

function motionItem(reading: Reading): MetricItem {
  const base = { id: "motion", label: LABELS.motion, gasLevel: null } as const;
  if (reading.motion) {
    return { ...base, value: "Com movimento", hint: null, tone: "active", flashKey: "on" };
  }
  if (reading.stoveOn) {
    return {
      ...base,
      value: "Sem movimento",
      hint: `há ${reading.secondsWithoutMotion} s`,
      tone: "idle",
      flashKey: "off-stove",
    };
  }
  return { ...base, value: "Sem movimento", hint: null, tone: "idle", flashKey: "off" };
}

export function metricsView(reading: Reading | null): MetricItem[] {
  if (reading === null) {
    return [
      emptyItem("mq6"),
      emptyItem("mq2"),
      emptyItem("flame"),
      emptyItem("temperature"),
      emptyItem("motion"),
      emptyItem("stove"),
    ];
  }

  return [
    {
      id: "mq6",
      label: LABELS.mq6,
      value: String(reading.mq6.value),
      hint: formatGasDelta(reading.mq6.value, reading.mq6.base),
      tone: GAS_TONE[reading.mq6.level],
      gasLevel: reading.mq6.level,
      flashKey: String(reading.mq6.level),
    },
    {
      id: "mq2",
      label: LABELS.mq2,
      value: String(reading.mq2.value),
      hint: null,
      tone: GAS_TONE[reading.mq2.level],
      gasLevel: reading.mq2.level,
      flashKey: String(reading.mq2.level),
    },
    {
      id: "flame",
      label: LABELS.flame,
      value: reading.flame ? "Sim" : "Não",
      hint: null,
      tone: reading.flame ? "active" : "idle",
      gasLevel: null,
      flashKey: String(reading.flame),
    },
    {
      id: "temperature",
      label: LABELS.temperature,
      value: formatTemperature(reading.temperature.celsius),
      hint: `limite ${formatTemperature(reading.temperature.limit)}`,
      tone: reading.temperature.high ? "warn" : "idle",
      gasLevel: null,
      flashKey: String(reading.temperature.high),
    },
    motionItem(reading),
    {
      id: "stove",
      label: LABELS.stove,
      value: reading.stoveOn ? "Ligado" : "Desligado",
      hint: null,
      tone: reading.stoveOn ? "active" : "idle",
      gasLevel: null,
      flashKey: String(reading.stoveOn),
    },
  ];
}

const ICON_TONE: Record<MetricTone, string> = {
  idle: "bg-muted text-muted-foreground",
  active: "bg-primary/12 text-primary",
  warn: "bg-amber-400/20 text-amber-700 dark:text-amber-300",
  danger: "bg-red-500/15 text-red-600 dark:text-red-400",
};

const VALUE_TONE: Record<MetricTone, string> = {
  idle: "",
  active: "",
  warn: "text-amber-700 dark:text-amber-300",
  danger: "text-red-600 dark:text-red-400",
};

const METER_FILL: Record<GasLevel, string> = {
  0: "bg-emerald-500",
  1: "bg-amber-400",
  2: "bg-red-500",
};

function GasMeter({ level }: { level: GasLevel }) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <div className="flex flex-1 gap-1" aria-hidden>
        {[0, 1, 2].map((step) => (
          <span
            key={step}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-500",
              step <= level ? METER_FILL[level] : "bg-muted",
            )}
          />
        ))}
      </div>
      <span className="text-[0.6875rem] font-medium text-muted-foreground">
        {GAS_STATUS[level]}
      </span>
    </div>
  );
}

export function MetricsGrid({ reading }: { reading: Reading | null }) {
  const items = metricsView(reading);

  return (
    <section aria-label="Métricas" className="grid grid-cols-2 gap-3">
      {items.map((item) => {
        const Icon = ICONS[item.id];
        return (
          <article
            key={item.id}
            className="panel flex flex-col rounded-2xl p-4"
          >
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-xl transition-colors duration-500",
                  ICON_TONE[item.tone],
                )}
              >
                <Icon aria-hidden className="size-4" strokeWidth={2} />
              </span>
              <p className="min-w-0 text-xs leading-snug font-medium text-muted-foreground">
                {item.label}
              </p>
            </div>
            <div
              key={item.flashKey}
              className="-mx-1.5 mt-3 animate-flash rounded-lg px-1.5"
            >
              <p
                className={cn(
                  "text-xl leading-tight font-semibold tracking-tight tabular-nums",
                  VALUE_TONE[item.tone],
                )}
              >
                {item.value}
              </p>
              {item.hint ? (
                <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                  {item.hint}
                </p>
              ) : null}
            </div>
            {item.gasLevel !== null ? (
              <div className="mt-auto">
                <GasMeter level={item.gasLevel} />
              </div>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}
