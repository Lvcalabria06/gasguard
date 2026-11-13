function parseLocalIso(iso: string): Date | null {
  const [datePart, timePart] = iso.split("T");
  if (!datePart || !timePart || timePart.includes("Z") || timePart.includes("+")) {
    return null;
  }
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);
  if ([year, month, day, hour, minute, second].some((value) => !Number.isFinite(value))) {
    return null;
  }
  return new Date(year, month - 1, day, hour, minute, second);
}

export function formatAge(isoTimestamp: string, now: Date): string {
  const then = parseLocalIso(isoTimestamp);
  if (!then) return "há 0 s";
  const seconds = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 1000));
  if (seconds < 60) return `há ${seconds} s`;
  if (seconds < 3600) return `há ${Math.floor(seconds / 60)} min`;
  return `há ${Math.floor(seconds / 3600)} h`;
}

export function formatGasDelta(value: number, base: number): string {
  const delta = Math.round(value - base);
  return `${delta >= 0 ? "+" : ""}${delta}`;
}

export function formatTemperature(celsius: number | null): string {
  if (celsius === null) return "—";
  return `${celsius} °C`;
}
