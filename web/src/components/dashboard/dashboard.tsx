"use client";

import { useState } from "react";

import { AccountMenu } from "@/components/auth/account-menu";
import { useReadings } from "@/hooks/use-readings";
import type { EventFilterState, Reading, RecentReadings } from "@/types";

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
  email,
}: {
  initial: RecentReadings | null;
  email: string | null;
}) {
  const { readings, events, connection, secondsSinceLast } =
    useReadings(initial);
  const [filter, setFilter] = useState<EventFilterState>(DEFAULT_EVENT_FILTER);
  const view = dashboardView(readings, filter);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className="flex flex-1 flex-col gap-4 px-4 py-6">
        <AccountMenu email={email} />
        <DashboardHeader
          connection={connection}
          secondsSinceLast={secondsSinceLast}
        />
        <RiskCard reading={view.latest} connection={connection} />
        <MetricsGrid reading={view.latest} />
        <ReadingsChart readings={view.readings} />
        <div className="space-y-3">
          <EventFilters value={view.filter} onChange={setFilter} />
          <EventList events={events} filter={view.filter} />
        </div>
      </main>
      <footer className="px-4 pb-6 text-xs text-muted-foreground">
        {view.footer}
      </footer>
    </div>
  );
}
