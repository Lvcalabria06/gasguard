"use client";

import { useState } from "react";
import { Info } from "lucide-react";

import { AccountMenu } from "@/components/auth/account-menu";
import { useReadings } from "@/hooks/use-readings";
import type {
  ConnectionStatus,
  EventFilterState,
  Reading,
  RecentReadings,
} from "@/types";

import { DashboardHeader } from "./dashboard-header";
import { DEFAULT_EVENT_FILTER, EventFilters } from "./event-filters";
import { EventList } from "./event-list";
import { MetricsGrid } from "./metrics-grid";
import { ReadingsChart } from "./readings-chart";
import { RiskCard } from "./risk-card";

export const ACADEMIC_FOOTER =
  "Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado.";

export function latestReading(readings: Reading[]): Reading | null {
  return readings.length === 0 ? null : readings[readings.length - 1];
}

export function liveReading(
  reading: Reading | null,
  connection: ConnectionStatus,
): Reading | null {
  return connection === "no_data" ? null : reading;
}

export function dashboardView(
  readings: Reading[],
  filter: EventFilterState,
) {
  return {
    latest: latestReading(readings),
    readings,
    filter,
    footer: ACADEMIC_FOOTER,
  };
}

export function Dashboard({
  initial,
  user,
  signOutAction,
}: {
  initial: RecentReadings | null;
  user: { name: string; email: string };
  signOutAction: () => Promise<void>;
}) {
  const { readings, events, connection, secondsSinceLast } =
    useReadings(initial);
  const [filter, setFilter] = useState<EventFilterState>(DEFAULT_EVENT_FILTER);
  const view = dashboardView(readings, filter);

  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent)]"
      />

      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <DashboardHeader
            connection={connection}
            secondsSinceLast={secondsSinceLast}
          />
          <AccountMenu user={user} signOutAction={signOutAction} />
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-4 px-4 py-5 sm:px-6 sm:py-6 lg:grid-cols-12 lg:gap-6 lg:py-8">
        <div className="flex flex-col gap-4 lg:col-span-5 lg:gap-6">
          <RiskCard reading={view.latest} connection={connection} />
          <MetricsGrid reading={liveReading(view.latest, connection)} />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-7 lg:gap-6">
          <ReadingsChart
            readings={view.readings}
            stale={connection === "no_data"}
          />
          <section className="panel space-y-4 p-5">
            <EventFilters value={view.filter} onChange={setFilter} />
            <EventList events={events} filter={view.filter} />
          </section>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 pt-2 pb-8 sm:px-6">
        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <span>{view.footer}</span>
        </p>
      </footer>
    </div>
  );
}
