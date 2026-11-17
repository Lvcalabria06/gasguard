import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import type { Reading } from "@/types";

export type ChartPoint = {
  time: string;
  mq6: number;
  mq2: number;
  temperature: number | null;
};

export type ChartGroup = "gas" | "temp";

export type ChartSeries = {
  id: "mq6" | "mq2" | "temperature";
  label: string;
  yAxisId: ChartGroup;
  color: string;
  unit: string;
};

const SERIES: ChartSeries[] = [
  { id: "mq6", label: "GLP (MQ-6)", yAxisId: "gas", color: "var(--chart-1)", unit: "" },
  {
    id: "mq2",
    label: "Gases / fumaça (MQ-2)",
    yAxisId: "gas",
    color: "var(--chart-2)",
    unit: "",
  },
  {
    id: "temperature",
    label: "Temperatura",
    yAxisId: "temp",
    color: "var(--chart-3)",
    unit: " °C",
  },
];

const GROUPS: { id: ChartGroup; label: string }[] = [
  { id: "gas", label: "Gases" },
  { id: "temp", label: "Temperatura" },
];

const AXIS_TICK = { fontSize: 11, fill: "var(--color-muted-foreground)" };

function chartTime(timestamp: string): string {
  const [, time] = timestamp.split("T");
  return time ?? timestamp;
}

export function chartView(readings: Reading[]) {
  const points: ChartPoint[] = readings.map((reading) => ({
    time: chartTime(reading.timestamp),
    mq6: reading.mq6.value,
    mq2: reading.mq2.value,
    temperature: reading.temperature.celsius,
  }));

  return {
    points,
    series: SERIES,
    showDot: points.length === 1,
  };
}

function formatValue(value: unknown, unit: string): string {
  return typeof value === "number" ? `${value}${unit}` : "—";
}

type TooltipEntry = { dataKey?: unknown; value?: unknown };

function ChartTooltip({
  active,
  payload,
  label,
  series,
}: {
  active?: boolean;
  payload?: readonly TooltipEntry[];
  label?: unknown;
  series: ChartSeries[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      <p className="mb-1 font-medium tabular-nums text-muted-foreground">{String(label)}</p>
      {series.map((item) => {
        const entry = payload.find((row) => row.dataKey === item.id);
        return (
          <p key={item.id} className="flex items-center gap-2 tabular-nums">
            <span className="size-2 rounded-full" style={{ background: item.color }} />
            <span className="text-muted-foreground">{item.label}</span>
            <span className="ml-auto pl-3 font-semibold">
              {formatValue(entry?.value, item.unit)}
            </span>
          </p>
        );
      })}
    </div>
  );
}

export function ReadingsChart({
  readings,
  stale = false,
}: {
  readings: Reading[];
  /** No fresh data: the legend must not present the last value as current. */
  stale?: boolean;
}) {
  const { points, series, showDot } = chartView(readings);
  const [group, setGroup] = useState<ChartGroup>("gas");
  const visible = series.filter((item) => item.yAxisId === group);
  const latest = stale ? undefined : points[points.length - 1];

  return (
    <section aria-label="Últimos 10 min" className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="eyebrow">Últimos 10 min</h2>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {visible.map((item) => (
              <li key={item.id} className="flex items-center gap-1.5 text-xs">
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: item.color }}
                />
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-semibold tabular-nums">
                  {latest ? formatValue(latest[item.id], item.unit) : "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div
          role="tablist"
          aria-label="Série do gráfico"
          className="inline-flex rounded-full bg-muted p-0.5"
        >
          {GROUPS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={group === item.id}
              onClick={() => setGroup(item.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-all",
                group === item.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {points.length === 0 ? (
        <p className="mt-4 grid h-56 place-items-center rounded-2xl border border-dashed text-sm text-muted-foreground">
          Aguardando leituras…
        </p>
      ) : (
        <div className="mt-4 -ml-2 h-56">
          <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 320, height: 224 }}
          >
            <AreaChart data={points} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
              <defs>
                {series.map((item) => (
                  <linearGradient
                    key={item.id}
                    id={`fill-${item.id}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={item.color} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={item.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid
                stroke="var(--color-border)"
                strokeDasharray="4 4"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                minTickGap={32}
                tickMargin={8}
                tickFormatter={(value: string) => value.slice(0, 5)}
              />
              <YAxis
                yAxisId={group}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={44}
                tickFormatter={(value: number) =>
                  group === "temp" ? `${value}°` : String(value)
                }
                domain={["auto", "auto"]}
                allowDecimals={group === "temp"}
              />
              <Tooltip
                isAnimationActive={false}
                cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }}
                content={<ChartTooltip series={visible} />}
              />
              {visible.map((item) => (
                <Area
                  key={item.id}
                  yAxisId={item.yAxisId}
                  dataKey={item.id}
                  name={item.label}
                  type="monotone"
                  stroke={item.color}
                  strokeWidth={2}
                  fill={`url(#fill-${item.id})`}
                  dot={showDot ? { r: 3, strokeWidth: 0, fill: item.color } : false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-card)" }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
