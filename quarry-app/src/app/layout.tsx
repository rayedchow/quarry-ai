import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { DockNav } from "@/components/layout/dock-nav";

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
        <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-950 via-slate-950/90 to-slate-950 text-white">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-white/5 bg-black/50">
            <div className="container flex flex-col gap-3 py-8 text-sm text-white/60 md:flex-row md:items-center md:justify-between">
              <p>© {new Date().getFullYear()} Quarry AI. All rights reserved.</p>
              <div className="flex gap-4">
                <a href="/privacy" className="hover:text-white">
                  Privacy
                </a>
                <a href="/terms" className="hover:text-white">
                  Terms
                </a>
                <a href="/status" className="hover:text-white">
                  Status
                </a>
              </div>
            </div>
          </footer>
        </div>
        <DockNav />
      </body>
    </html>
  );
}
