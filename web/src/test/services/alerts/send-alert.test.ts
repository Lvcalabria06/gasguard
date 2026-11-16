import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { sendAlertEmail } from "@/services/alerts/send-alert";

describe("sendAlertEmail", () => {
  it("sends via SMTP sendMail and returns true on success", async () => {
    const sendMail = vi.fn(async () => undefined);

    await expect(
      sendAlertEmail({
        to: "ada@example.com",
        subject: "[SIMULAÇÃO] GasGuard: risco crítico",
        text: "corpo",
        user: "gasguard@gmail.com",
        pass: "app-password",
        from: "GasGuard <gasguard@gmail.com>",
        sendMail,
      }),
    ).resolves.toBe(true);

    expect(sendMail).toHaveBeenCalledExactlyOnceWith({
      from: "GasGuard <gasguard@gmail.com>",
      to: "ada@example.com",
      subject: "[SIMULAÇÃO] GasGuard: risco crítico",
      text: "corpo",
    });
  });

  it("returns false and logs when SMTP sendMail rejects", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("Invalid login");
    const sendMail = vi.fn(async () => {
      throw error;
    });

    await expect(
      sendAlertEmail({
        to: "ada@example.com",
        subject: "x",
        text: "y",
        user: "gasguard@gmail.com",
        pass: "bad",
        from: "GasGuard <gasguard@gmail.com>",
        sendMail,
      }),
    ).resolves.toBe(false);

    expect(console.error).toHaveBeenCalledWith("[alerts] smtp", error);
  });
});
