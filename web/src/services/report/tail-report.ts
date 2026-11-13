import "server-only";

export interface TailSnapshot {
  size: number;
  truncated: boolean;
  lines: string[];
}

function takeCompleteLines(chunk: string): { lines: string[]; consumed: number } {
  const lastNewline = chunk.lastIndexOf("\n");
  if (lastNewline === -1) return { lines: [], consumed: 0 };
  return {
    lines: chunk.slice(0, lastNewline).split("\n"),
    consumed: lastNewline + 1,
  };
}

export function readNewLines(content: string, previousSize: number): TailSnapshot {
  const truncated = content.length < previousSize;
  const fromStart = truncated || previousSize === 0;

  if (fromStart) {
    const { lines, consumed } = takeCompleteLines(content);
    if (lines.length < 2) {
      return { size: 0, truncated, lines: [] };
    }
    return {
      size: consumed,
      truncated,
      lines: lines.slice(2),
    };
  }

  const { lines, consumed } = takeCompleteLines(content.slice(previousSize));
  return {
    size: previousSize + consumed,
    truncated: false,
    lines,
  };
}
