export function formatSse(
  event: "reading" | "ping" | "reset",
  data = "",
): string {
  return `event: ${event}\ndata: ${data}\n\n`;
}
