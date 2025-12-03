"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileLock2, ShieldCheck, Sparkles, FileCode2, Clock, HardDrive } from "lucide-react";
import Link from "next/link";

export default function DownloadPage() {
  return (
    <div className="space-y-12 py-8">
      <Link
        href="/checkout"
        className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to checkout
      </Link>

      {/* Hero Section */}
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5">
          <Download className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">Download Center</span>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
          Your encrypted slice
          <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">is ready.</span>
        </h1>
        <p className="max-w-2xl text-lg text-white/60">
          The requested projection has been generated server-side and sealed
          with a one-time key. Download within 24 hours or regenerate from the
          agent.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        {/* File Metadata */}
        <div className="glass-panel p-8 space-y-6">
          <div className="glass-card p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="section-label">File metadata</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Slice #7f09d
                </h2>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-medium text-emerald-400">Encrypted</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="rounded-xl bg-white/[0.03] p-4 text-center">
                <HardDrive className="h-5 w-5 text-cyan-400 mx-auto mb-2" />
                <p className="text-xl font-semibold text-white">87 MB</p>
                <p className="text-xs text-white/40 mt-1">Size</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-4 text-center">
                <FileCode2 className="h-5 w-5 text-violet-400 mx-auto mb-2" />
                <p className="text-xl font-semibold text-white">Parquet</p>
                <p className="text-xs text-white/40 mt-1">Format</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-4 text-center">
                <Clock className="h-5 w-5 text-amber-400 mx-auto mb-2" />
                <p className="text-xl font-semibold text-white">24h</p>
                <p className="text-xs text-white/40 mt-1">Expires</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
            <p className="section-label mb-3">Included columns</p>
            <div className="space-y-2">
              {[
                { name: "loyalty_tier", type: "string" },
                { name: "churn_flag", type: "bool" },
                { name: "sentiment_score", type: "float" },
                { name: "wait_time_min", type: "int" },
              ].map((col) => (
                <div
                  key={col.name}
                  className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-2.5"
                >
                  <span className="font-medium text-white/80">{col.name}</span>
                  <span className="text-xs text-white/30 font-mono">{col.type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Download Actions */}
        <div className="glass-panel p-8 space-y-6">
          <div className="glass-card p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500">
                <FileLock2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white">Download key</p>
                <p className="mt-1 text-sm text-white/50 leading-relaxed">
                  Use the provided wallet signature to decrypt once. Future access
                  requires regenerating from the Agent page.
                </p>
              </div>
            </div>
          </div>

          <Button className="w-full h-14 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold shadow-[0_4px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.4)] transition-all duration-300 hover:-translate-y-0.5">
            <Download className="h-5 w-5 mr-2" />
            Download slice
          </Button>

          <Button className="btn-secondary w-full h-12" asChild>
            <Link href="/agent">Return to agent</Link>
          </Button>

          <div className="glass-card p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-white/10">
                <ShieldCheck className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="font-semibold text-white">Audit trail</p>
                <p className="mt-1 text-sm text-white/50 leading-relaxed">
                  Every download is immutably logged with dataset chips, wallet ID,
                  and watermark hash for revocation-ready compliance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
