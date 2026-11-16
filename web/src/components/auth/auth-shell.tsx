import type { ReactNode } from "react";
import { Bell, Flame, Info, Waves } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";

const FOOTER =
  "Protótipo acadêmico — Sistemas Embarcados, CESAR School 2026. Não é um detector certificado.";

const FEATURES = [
  { icon: Waves, text: "Gás GLP e fumaça medidos a cada segundo" },
  { icon: Flame, text: "Chama, temperatura e fogão sem supervisão" },
  { icon: Bell, text: "E-mail quando o risco fica crítico" },
];

/** Page frame for /login and /cadastro: brand panel (desktop) + form card. */
export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 p-12 text-white lg:flex lg:flex-col">
        <div
          aria-hidden
          className="absolute -top-32 -left-24 size-[28rem] rounded-full bg-sky-500/25 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -right-24 -bottom-40 size-[30rem] rounded-full bg-indigo-500/25 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.04)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(70%_60%_at_40%_40%,black,transparent)]"
        />

        <BrandMark size="lg" className="relative [&_p]:text-white" />

        <div className="relative mt-auto max-w-md">
          <h2 className="text-4xl leading-[1.1] font-semibold tracking-tight text-balance">
            Gás, chama e temperatura da cozinha, em tempo real.
          </h2>
          <ul className="mt-8 space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/80">
                <span className="grid size-9 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15 ring-inset">
                  <Icon aria-hidden className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative mt-12 flex items-start gap-2 text-xs leading-relaxed text-white/55">
          <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          {FOOTER}
        </p>
      </aside>

      <div className="relative isolate flex flex-col px-4 py-8 sm:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(70%_100%_at_50%_0%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent)] lg:hidden"
        />
        <BrandMark subtitle="Monitor da cozinha" className="lg:hidden" />

        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <div className="mb-7 space-y-1.5">
            <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight">
              {title}
            </h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {children}
        </main>

        <footer className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground lg:hidden">
          <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          {FOOTER}
        </footer>
      </div>
    </div>
  );
}
