"use client";

import { Button } from "@/components/ui/button";
import { Wallet2, ArrowRight, ShieldCheck, Download, Sparkles, Check } from "lucide-react";
import Link from "next/link";

const includedDatasets = [
  { name: "Global E-commerce Behavior 2024", rows: 1000, columns: 6 },
  { name: "DeFi Transaction Graph Q3", rows: 600, columns: 4 },
  { name: "Streaming Sentiment Radar", rows: 400, columns: 3 },
];

export default function CheckoutPage() {
  const totalRows = includedDatasets.reduce((sum, item) => sum + item.rows, 0);
  const pricePerRow = 0.002;
  const total = totalRows * pricePerRow;

  return (
    <div className="space-y-12 py-8">
      {/* Hero Section */}
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5">
          <Wallet2 className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">Checkout</span>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
          Approve purchase and
          <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">release the slice.</span>
        </h1>
        <p className="max-w-2xl text-lg text-white/60">
          Review the datasets, schema-only preview, and total price before
          authorizing the transfer from your wallet.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Selected Datasets */}
        <div className="glass-panel p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="section-label">Your order</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Selected datasets
              </h2>
            </div>
            <div className="stat-chip">
              <span className="text-white/60">{includedDatasets.length}</span>
              <span className="text-white/40">attached</span>
            </div>
          </div>

          <div className="space-y-3">
            {includedDatasets.map((dataset, index) => (
              <div
                key={dataset.name}
                className="glass-card p-5 flex items-center gap-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-white/10">
                  <span className="text-sm font-semibold text-white">{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{dataset.name}</p>
                  <div className="mt-1 flex items-center gap-4 text-sm text-white/40">
                    <span>{dataset.rows.toLocaleString()} rows</span>
                    <span className="h-1 w-1 rounded-full bg-white/20" />
                    <span>{dataset.columns} columns</span>
                  </div>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
                  <Check className="h-4 w-4 text-emerald-400" />
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 text-sm">
            <p className="section-label mb-2">Notes</p>
            <p className="text-white/50 leading-relaxed">
              Only schema metadata leaves provider infrastructure. Raw data is
              generated server-side after the transaction settles on-chain.
            </p>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="glass-panel p-8 space-y-6">
          <div>
            <p className="section-label">Payment summary</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Cost details</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/50">Total rows</span>
              <span className="font-medium text-white">{totalRows.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/50">Price per row</span>
              <span className="font-medium text-white">{pricePerRow.toFixed(3)} SOL</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/50">Datasets included</span>
              <span className="font-medium text-white">{includedDatasets.length}</span>
            </div>
            <div className="divider my-4" />
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-white">Total</span>
              <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                {total.toFixed(3)} SOL
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <Button className="w-full h-14 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold shadow-[0_4px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.4)] transition-all duration-300 hover:-translate-y-0.5">
              <Wallet2 className="h-5 w-5 mr-2" />
              Connect wallet & pay
            </Button>

            <Button
              className="btn-secondary w-full h-12"
              asChild
            >
              <Link href="/download">
                Continue to download
                <Download className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20">
                <ShieldCheck className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="font-semibold text-white">Trustless delivery</p>
                <p className="mt-0.5 text-sm text-white/50">
                  Watermarked and audit-ready
                </p>
              </div>
            </div>
          </div>

          <Button variant="ghost" className="w-full text-white/60 hover:text-white" asChild>
            <Link href="/agent">
              <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
              Back to agent
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
