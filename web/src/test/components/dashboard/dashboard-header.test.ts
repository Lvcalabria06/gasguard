import { describe, expect, it } from "vitest";

import type { ConnectionStatus } from "@/types";

import { headerView } from "./dashboard-header";

describe("headerView", () => {
  it("maps each connection status to the pt-BR label and dot color", () => {
    const cases: [ConnectionStatus, string, string][] = [
      ["live", "Ao vivo", "bg-emerald-500"],
      ["reconnecting", "Reconectando", "bg-amber-400"],
      ["no_data", "Sem dados", "bg-zinc-400"],
    ];

    for (const [connection, statusLabel, dotClass] of cases) {
      expect(headerView(connection, 3)).toMatchObject({
        title: "GasGuard",
        statusLabel,
        dotClass,
      });
    }
  });

  it("formats age as há N s and hides it when secondsSinceLast is null", () => {
    expect(headerView("live", 0).ageLabel).toBe("há 0 s");
    expect(headerView("live", 12).ageLabel).toBe("há 12 s");
    expect(headerView("no_data", 8).ageLabel).toBe("há 8 s");
    expect(headerView("reconnecting", 60).ageLabel).toBe("há 60 s");
    expect(headerView("no_data", null).ageLabel).toBeNull();
  });

  it("does not infer no_data from a stale second count", () => {
    const view = headerView("live", 8);

    expect(view.statusLabel).toBe("Ao vivo");
    expect(view.ageLabel).toBe("há 8 s");
  });
});
