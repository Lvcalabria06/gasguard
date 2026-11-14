import "server-only";

import { listUsers } from "@/services/auth/users";
import { watchReadings } from "@/services/report/report-service";
import type { Reading, RiskLevel } from "@/types";

import {
  alertSubject,
  alertText,
  canSendAlert,
  enteredCritical,
} from "./alert-policy";
import { sendAlertEmail } from "./send-alert";

export type AlertSend = typeof sendAlertEmail;

export function shouldStartAlertWatcher(
  runtime = process.env.NEXT_RUNTIME,
  phase = process.env.NEXT_PHASE,
): boolean {
  return runtime === "nodejs" && phase !== "phase-production-build";
}

export async function handleCriticalReading(input: {
  previousLevel: RiskLevel | null;
  reading: Reading;
  now: number;
  users: { email: string }[];
  lastSent: Map<string, number>;
  user: string | undefined;
  pass: string | undefined;
  from: string;
  send: AlertSend;
}): Promise<void> {
  if (!enteredCritical(input.previousLevel, input.reading.level)) return;
  if (input.users.length === 0) {
    console.info("[alerts] no users; skip");
    return;
  }
  if (!input.user || !input.pass) {
    console.info("[alerts] Gmail credentials missing; skip");
    return;
  }
  for (const user of input.users) {
    if (!canSendAlert(input.lastSent.get(user.email), input.now)) continue;
    const ok = await input.send({
      to: user.email,
      subject: alertSubject(input.reading.source),
      text: alertText(input.reading),
      user: input.user,
      pass: input.pass,
      from: input.from,
    });
    if (ok) input.lastSent.set(user.email, input.now);
  }
}

export function startAlertWatcher(send: AlertSend = sendAlertEmail): () => void {
  let previous: RiskLevel | null = null;
  const lastSent = new Map<string, number>();

  try {
    return watchReadings({
      onReading: (reading) => {
        const from = previous;
        previous = reading.level;
        const gmailUser = process.env.GMAIL_USER || undefined;
        void handleCriticalReading({
          previousLevel: from,
          reading,
          now: Date.now(),
          users: listUsers(),
          lastSent,
          user: gmailUser,
          pass: process.env.GMAIL_APP_PASSWORD || undefined,
          from:
            process.env.ALERT_FROM_EMAIL ??
            gmailUser ??
            "GasGuard <alertas@localhost>",
          send,
        }).catch((error) => {
          console.error("[alerts]", error);
        });
      },
      onReset: () => {
        previous = null;
      },
    });
  } catch (error) {
    console.error("[alerts]", error);
    return () => {};
  }
}
