import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { sendAlertEmail } from "./send-alert";

describe("sendAlertEmail", () => {
  it("POSTs JSON to api.resend.com/emails and returns true on 2xx", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input, init) => {
      expect(input).toBe("https://api.resend.com/emails");
      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual({
        Authorization: "Bearer re_test",
        "Content-Type": "application/json",
      });
      expect(JSON.parse(String(init?.body))).toEqual({
        from: "GasGuard <alertas@localhost>",
        to: ["ada@example.com"],
        subject: "[SIMULAÇÃO] GasGuard: risco crítico",
        text: "corpo",
      });
      return new Response("{}", { status: 200 });
    });

    await expect(
      sendAlertEmail({
        to: "ada@example.com",
        subject: "[SIMULAÇÃO] GasGuard: risco crítico",
        text: "corpo",
        apiKey: "re_test",
        from: "GasGuard <alertas@localhost>",
        fetchImpl,
      }),
    ).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("returns false and logs when Resend rejects the request", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchImpl = vi.fn<typeof fetch>(
      async () => new Response("nope", { status: 403 }),
    );

    await expect(
      sendAlertEmail({
        to: "ada@example.com",
        subject: "x",
        text: "y",
        apiKey: "re_test",
        from: "GasGuard <alertas@localhost>",
        fetchImpl,
      }),
    ).resolves.toBe(false);
    expect(console.error).toHaveBeenCalledWith(
      "[alerts] resend",
      403,
      "nope",
    );
  });
});
