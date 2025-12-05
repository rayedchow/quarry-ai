import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { DockNav } from "@/components/layout/dock-nav";
import { BackgroundLines } from "@/components/ui/background-lines";
import { WalletContextProvider } from "@/components/providers/wallet-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quarry AI | The Future of Data Exchange",
  description:
    "Schema-only browsing, multi-dataset orchestration, and trustless delivery for enterprise data teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground antialiased`}
      >
        <WalletContextProvider>
        <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
          <BackgroundLines
            className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-50 saturate-150 blur-[1px]"
            svgOptions={{ duration: 18 }}
          />
          <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.25),transparent_55%),radial-gradient(circle_at_80%_0%,rgba(147,51,234,0.3),transparent_50%),radial-gradient(circle_at_10%_80%,rgba(15,118,110,0.25),transparent_60%)]" />
          <div className="relative z-10 flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">
              <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
                {children}
              </div>
            </main>
          </div>
          <DockNav />
        </div>
        </WalletContextProvider>
      </body>
    </html>
  );
}
