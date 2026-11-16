import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Reading } from "@/types";

export type ChartPoint = {
  time: string;
  mq6: number;
  mq2: number;
  temperature: number | null;
};

export type ChartSeries = {
  id: "mq6" | "mq2" | "temperature";
  label: string;
  yAxisId: "gas" | "temp";
  color: string;
};

const SERIES: ChartSeries[] = [
  { id: "mq6", label: "GLP (MQ-6)", yAxisId: "gas", color: "#0284c7" },
  {
    id: "mq2",
    label: "Gases / fumaça (MQ-2)",
    yAxisId: "gas",
    color: "#d97706",
  },
  {
    id: "temperature",
    label: "Temperatura",
    yAxisId: "temp",
    color: "#e11d48",
  },
];

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

function SeriesLegend({ series }: { series: ChartSeries[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {series.map((item) => (
        <li key={item.id} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full"
            style={{ background: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export function ReadingsChart({ readings }: { readings: Reading[] }) {
  const { points, series, showDot } = chartView(readings);

  return (
    <section
      aria-label="Últimos 10 min"
      className="overflow-hidden rounded-2xl border bg-card p-4"
    >
      <h2 className="text-xs font-medium text-muted-foreground">
        Últimos 10 min
      </h2>
      <SeriesLegend series={series} />
      {points.length === 0 ? (
        <p className="flex h-52 items-center justify-center text-sm text-muted-foreground">
          —
        </p>
      ) : (
        <div className="mt-1 h-52">
          <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 320, height: 208 }}
          >
            <LineChart
              data={points}
              margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                stroke="var(--color-border)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tick={{
                  fontSize: 11,
                  fill: "var(--color-muted-foreground)",
                }}
                tickLine={false}
                axisLine={false}
                minTickGap={28}
                tickFormatter={(value: string) => value.slice(0, 5)}
              />
              <YAxis
                yAxisId="gas"
                tick={{
                  fontSize: 11,
                  fill: "var(--color-muted-foreground)",
                }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <YAxis
                yAxisId="temp"
                orientation="right"
                tick={{
                  fontSize: 11,
                  fill: "var(--color-muted-foreground)",
                }}
                tickLine={false}
                axisLine={false}
                width={32}
                tickFormatter={(value: number) => `${value}°`}
              />
              <Tooltip
                isAnimationActive={false}
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              {series.map((item) => (
                <Line
                  key={item.id}
                  yAxisId={item.yAxisId}
                  dataKey={item.id}
                  name={item.label}
                  stroke={item.color}
                  strokeWidth={1.75}
                  dot={showDot ? { r: 3, strokeWidth: 0 } : false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
