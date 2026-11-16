import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GasGuard",
  description: "Monitoramento de gás e risco de incêndio — protótipo acadêmico.",
};

export const SYSTEM_THEME_SCRIPT = `(function () {
  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  var sync = function () {
    document.documentElement.classList.toggle("dark", mq.matches);
  };
  sync();
  mq.addEventListener("change", sync);
})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: SYSTEM_THEME_SCRIPT }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
