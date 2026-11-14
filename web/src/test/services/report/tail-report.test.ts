import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { readNewLines } from "@/services/report/tail-report";

const HEADER =
  "hora,origem,nivel,cenario,mq6,mq6_base,mq6_nivel,mq2,mq2_base,mq2_nivel,chama,temp,temp_limite,temp_alta,movimento,fogao,seg_sem_movimento";

const LINE_A =
  "14:32:08,placa,CRITICO,1,1120,290,2,1350,900,1,1,29.1,28.4,1,0,1,42";
const LINE_B =
  "14:32:09,placa,CRITICO,1,1118,290,2,1342,900,1,1,29.1,28.4,1,0,1,43";
const LINE_C =
  "14:32:10,placa,FALHA,16,300,290,0,910,900,0,0,,28.4,0,1,0,0";

function report(dataLines: string[], incomplete = ""): string {
  return ["data,2026-11-10", HEADER, ...dataLines].join("\n") + "\n" + incomplete;
}

describe("readNewLines", () => {
  it("skips the date and header lines on a cold start", () => {
    const content = report([LINE_A, LINE_B]);
    const snapshot = readNewLines(content, 0);
    expect(snapshot.truncated).toBe(false);
    expect(snapshot.lines).toEqual([LINE_A, LINE_B]);
    expect(snapshot.size).toBe(content.length);
    expect(snapshot.lines.some((line) => line.startsWith("data,"))).toBe(false);
    expect(snapshot.lines).not.toContain(HEADER);
  });

  it("leaves a trailing fragment without newline out of lines and size", () => {
    const content = report([LINE_A], LINE_B);
    const snapshot = readNewLines(content, 0);
    expect(snapshot.lines).toEqual([LINE_A]);
    expect(snapshot.size).toBe(content.length - LINE_B.length);
    expect(content.slice(snapshot.size)).toBe(LINE_B);
  });

  it("returns only the bytes appended since previousSize", () => {
    const first = report([LINE_A]);
    const start = readNewLines(first, 0);
    const second = report([LINE_A, LINE_B]);
    const snapshot = readNewLines(second, start.size);
    expect(snapshot.truncated).toBe(false);
    expect(snapshot.lines).toEqual([LINE_B]);
    expect(snapshot.size).toBe(second.length);
  });

  it("completes a previous half-line on the next call", () => {
    const partial = report([LINE_A], LINE_B);
    const waiting = readNewLines(partial, 0);
    const complete = report([LINE_A, LINE_B]);
    const snapshot = readNewLines(complete, waiting.size);
    expect(snapshot.truncated).toBe(false);
    expect(snapshot.lines).toEqual([LINE_B]);
    expect(snapshot.size).toBe(complete.length);
  });

  it("rereads from the start and sets truncated when the content shrinks", () => {
    const previous = report([LINE_A, LINE_B, LINE_C]);
    const seeded = readNewLines(previous, 0);
    const rotated = ["data,2026-11-11", HEADER, LINE_A].join("\n") + "\n";
    expect(rotated.length).toBeLessThan(previous.length);
    const snapshot = readNewLines(rotated, seeded.size);
    expect(snapshot.truncated).toBe(true);
    expect(snapshot.lines).toEqual([LINE_A]);
    expect(snapshot.size).toBe(rotated.length);
    expect(snapshot.lines).not.toContain(HEADER);
  });

  it("does not advance size until both header lines are complete", () => {
    const onlyDate = "data,2026-11-10\n";
    const waiting = readNewLines(onlyDate, 0);
    expect(waiting).toEqual({ size: 0, truncated: false, lines: [] });

    const headersOnly = ["data,2026-11-10", HEADER].join("\n") + "\n";
    const headers = readNewLines(headersOnly, 0);
    expect(headers.truncated).toBe(false);
    expect(headers.lines).toEqual([]);
    expect(headers.size).toBe(headersOnly.length);

    const withData = report([LINE_A]);
    const snapshot = readNewLines(withData, headers.size);
    expect(snapshot.truncated).toBe(false);
    expect(snapshot.lines).toEqual([LINE_A]);
  });

  it("returns no lines when previousSize equals content.length", () => {
    const content = report([LINE_A]);
    const snapshot = readNewLines(content, content.length);
    expect(snapshot).toEqual({
      size: content.length,
      truncated: false,
      lines: [],
    });
  });
});
