import type { Reading, ReportEvent } from "@/types";

export function detectEvents(readings: Reading[]): ReportEvent[] {
  const events: ReportEvent[] = [];
  for (let index = 1; index < readings.length; index += 1) {
    const previous = readings[index - 1];
    const current = readings[index];
    if (current.level === previous.level) continue;
    events.push({
      id: current.timestamp,
      timestamp: current.timestamp,
      from: previous.level,
      to: current.level,
      scenarioId: current.scenarioId,
      source: current.source,
    });
  }
  return events;
}
