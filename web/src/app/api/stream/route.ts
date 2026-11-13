import { watchReadings } from "@/services/report/report-service";

import { formatSse } from "./sse-format";

export const runtime = "nodejs";

const PING_MS = 15_000;

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let shutdown = () => {};

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const send = (frame: string) => {
        if (closed) return;
        controller.enqueue(encoder.encode(frame));
      };

      // Next withholds the HTTP response until the first chunk.
      controller.enqueue(encoder.encode(""));

      const stopWatch = watchReadings({
        onReading: (reading) =>
          send(formatSse("reading", JSON.stringify(reading))),
        onReset: () => send(formatSse("reset")),
      });

      const pingId = setInterval(() => send(formatSse("ping")), PING_MS);

      shutdown = () => {
        if (closed) return;
        closed = true;
        stopWatch();
        clearInterval(pingId);
        try {
          controller.close();
        } catch {
          // already cancelled
        }
      };

      request.signal.addEventListener("abort", shutdown, { once: true });
    },
    cancel() {
      shutdown();
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
