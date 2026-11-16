import {
  CircleOff,
  Eye,
  Flame,
  ShieldCheck,
  Siren,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import type { RiskLevel } from "@/types";

/** Presentation of each firmware risk level (labels, icon, colors). No risk rules here. */
export type LevelTheme = {
  /** Short label for chips, badges and the event list. */
  label: string;
  /** Uppercase label for the risk card. */
  heading: string;
  icon: LucideIcon;
  /** Solid dot (event list, filter chips). */
  dotClass: string;
  /** Soft badge: tinted background + readable text in light and dark. */
  badgeClass: string;
  /** Risk card surface. */
  surfaceClass: string;
  textClass: string;
  /** Color of the breathing halo around the card (CSS color). */
  halo: string;
  pulse: boolean;
  /** CRITICAL alternates red/orange. */
  alternate: boolean;
};

export const LEVEL_THEME: Record<RiskLevel, LevelTheme> = {
  NORMAL: {
    label: "Normal",
    heading: "Normal",
    icon: ShieldCheck,
    dotClass: "bg-emerald-500",
    badgeClass:
      "bg-emerald-500/12 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
    surfaceClass: "bg-gradient-to-br from-emerald-500 to-teal-600",
    textClass: "text-white",
    halo: "oklch(0.7 0.15 160)",
    pulse: false,
    alternate: false,
  },
  ATTENTION: {
    label: "Atenção",
    heading: "Atenção",
    icon: Eye,
    dotClass: "bg-amber-400",
    badgeClass:
      "bg-amber-400/18 text-amber-800 ring-amber-500/30 dark:text-amber-300",
    surfaceClass: "bg-gradient-to-br from-amber-300 to-amber-400",
    textClass: "text-amber-950",
    halo: "oklch(0.83 0.16 85)",
    pulse: false,
    alternate: false,
  },
  ALERT: {
    label: "Alerta",
    heading: "Alerta",
    icon: TriangleAlert,
    dotClass: "bg-orange-500",
    badgeClass:
      "bg-orange-500/14 text-orange-700 ring-orange-500/30 dark:text-orange-300",
    surfaceClass: "bg-gradient-to-br from-orange-500 to-orange-600",
    textClass: "text-white",
    halo: "oklch(0.7 0.19 45)",
    pulse: true,
    alternate: false,
  },
  HIGH: {
    label: "Alto",
    heading: "Alto risco",
    icon: Siren,
    dotClass: "bg-red-600",
    badgeClass: "bg-red-500/14 text-red-700 ring-red-500/30 dark:text-red-300",
    surfaceClass: "bg-gradient-to-br from-red-500 to-red-700",
    textClass: "text-white",
    halo: "oklch(0.63 0.22 25)",
    pulse: true,
    alternate: false,
  },
  CRITICAL: {
    label: "Crítico",
    heading: "Crítico",
    icon: Flame,
    dotClass: "bg-red-900",
    badgeClass:
      "bg-red-900/14 text-red-900 ring-red-900/30 dark:bg-red-500/20 dark:text-red-200",
    surfaceClass: "bg-gradient-to-br from-red-800 to-red-950",
    textClass: "text-white",
    halo: "oklch(0.55 0.2 25)",
    pulse: true,
    alternate: true,
  },
  FAILURE: {
    label: "Falha",
    heading: "Falha",
    icon: CircleOff,
    dotClass: "bg-zinc-500",
    badgeClass: "bg-zinc-500/14 text-zinc-700 ring-zinc-500/25 dark:text-zinc-300",
    surfaceClass: "bg-gradient-to-br from-zinc-500 to-zinc-600",
    textClass: "text-white",
    halo: "oklch(0.55 0.01 260)",
    pulse: false,
    alternate: false,
  },
};
