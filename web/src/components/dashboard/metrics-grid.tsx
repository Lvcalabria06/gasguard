import { formatGasDelta, formatTemperature } from "@/lib/format";
import type { Reading } from "@/types";

const DASH = "—";

const LABELS = {
  mq6: "GLP (MQ-6)",
  mq2: "Gases / fumaça (MQ-2)",
  flame: "Chama",
  temperature: "Temperatura",
  motion: "Movimento",
  stove: "Fogão",
} as const;

export type MetricId = keyof typeof LABELS;

export type MetricItem = {
  id: MetricId;
  label: string;
  value: string;
  hint: string | null;
};

function emptyItem(id: MetricId): MetricItem {
  return { id, label: LABELS[id], value: DASH, hint: null };
}

function motionValue(reading: Reading): string {
  if (reading.stoveOn) {
    return `sem movimento há ${reading.secondsWithoutMotion} s`;
  }
  return reading.motion ? "Com movimento" : "Sem movimento";
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
    },
    {
      id: "mq2",
      label: LABELS.mq2,
      value: String(reading.mq2.value),
      hint: null,
    },
    {
      id: "flame",
      label: LABELS.flame,
      value: reading.flame ? "Sim" : "Não",
      hint: null,
    },
    {
      id: "temperature",
      label: LABELS.temperature,
      value: formatTemperature(reading.temperature.celsius),
      hint: `limite ${formatTemperature(reading.temperature.limit)}`,
    },
    {
      id: "motion",
      label: LABELS.motion,
      value: motionValue(reading),
      hint: null,
    },
    {
      id: "stove",
      label: LABELS.stove,
      value: reading.stoveOn ? "Ligado" : "Desligado",
      hint: null,
    },
  ];
}

export function MetricsGrid({ reading }: { reading: Reading | null }) {
  const items = metricsView(reading);

  return (
    <section
      aria-label="Métricas"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border"
    >
      {items.map((item) => (
        <article key={item.id} className="bg-background px-4 py-3">
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className="mt-1 text-lg font-medium tabular-nums tracking-tight">
            {item.value}
            {item.hint ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {item.hint}
              </span>
            ) : null}
          </p>
        </article>
      ))}
    </section>
  );
}
