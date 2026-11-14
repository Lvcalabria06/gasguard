import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono" }),
}));

vi.mock("./globals.css", () => ({}));

import RootLayout, { SYSTEM_THEME_SCRIPT } from "./layout";

type LayoutElement = {
  type: unknown;
  props: {
    lang: string;
    suppressHydrationWarning: boolean;
    children: [
      {
        type: unknown;
        props: {
          children: {
            type: unknown;
            props: { dangerouslySetInnerHTML: { __html: string } };
          };
        };
      },
      { type: unknown; props: { children: string } },
    ];
  };
};

describe("SYSTEM_THEME_SCRIPT", () => {
  it("toggles .dark from prefers-color-scheme and follows change", () => {
    const toggles: Array<[string, boolean | undefined]> = [];
    const listeners: Array<() => void> = [];
    let matches = true;

    const window = {
      matchMedia: (query: string) => {
        expect(query).toBe("(prefers-color-scheme: dark)");
        return {
          get matches() {
            return matches;
          },
          addEventListener: (type: string, fn: () => void) => {
            expect(type).toBe("change");
            listeners.push(fn);
          },
        };
      },
    };
    const document = {
      documentElement: {
        classList: {
          toggle: (token: string, force?: boolean) => {
            toggles.push([token, force]);
          },
        },
      },
    };

    const run = new Function("window", "document", SYSTEM_THEME_SCRIPT);
    run(window, document);

    expect(toggles).toEqual([["dark", true]]);

    matches = false;
    expect(listeners).toHaveLength(1);
    listeners[0]();
    expect(toggles).toEqual([
      ["dark", true],
      ["dark", false],
    ]);
  });
});

describe("RootLayout", () => {
  it("applies the system theme script before paint and keeps pt-BR", () => {
    const tree = RootLayout({ children: "child" } as never) as LayoutElement;

    expect(tree.type).toBe("html");
    expect(tree.props.lang).toBe("pt-BR");
    expect(tree.props.suppressHydrationWarning).toBe(true);

    const [head, body] = tree.props.children;
    expect(head.type).toBe("head");
    expect(head.props.children.type).toBe("script");
    expect(head.props.children.props.dangerouslySetInnerHTML).toEqual({
      __html: SYSTEM_THEME_SCRIPT,
    });
    expect(body.type).toBe("body");
    expect(body.props.children).toBe("child");
  });
});
