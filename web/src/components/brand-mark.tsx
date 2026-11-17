import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

/** GasGuard logo: a shield on a blue gradient tile, plus the wordmark. */
export function BrandMark({
  subtitle,
  size = "md",
  className,
}: {
  subtitle?: string;
  size?: "md" | "lg";
  className?: string;
}) {
  const large = size === "lg";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className={cn(
          "grid shrink-0 place-items-center bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-white shadow-[0_6px_16px_-6px_rgb(59_130_246/0.7)] ring-1 ring-white/20 ring-inset",
          large ? "size-11 rounded-2xl" : "size-9 rounded-xl",
        )}
      >
        <ShieldCheck className={large ? "size-6" : "size-5"} strokeWidth={2} />
      </span>
      <div className="leading-tight">
        <p className={cn("font-semibold tracking-tight", large ? "text-xl" : "text-base")}>
          GasGuard
        </p>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
    </div>
  );
}
