import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet2, ArrowRight, ShieldCheck, Download } from "lucide-react";
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
    <div className="container space-y-10 py-16">
      <div className="space-y-3">
        <Badge variant="outline">Checkout</Badge>
        <h1 className="text-4xl font-semibold text-white">
          Approve purchase and release the slice.
        </h1>
        <p className="text-muted-foreground">
          Review the datasets, schema-only preview, and total price before
          authorizing the transfer from your wallet.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6 rounded-3xl border border-white/10 bg-black/40 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-white">
              Selected datasets
            </h2>
            <Badge className="bg-white/10 text-white">
              {includedDatasets.length} attached
            </Badge>
          </div>
          <div className="space-y-4">
            {includedDatasets.map((dataset) => (
              <div
                key={dataset.name}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <p className="font-semibold text-white">{dataset.name}</p>
                <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                  <span>{dataset.rows} rows</span>
                  <span>{dataset.columns} columns</span>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-white/80">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">
              Notes
            </p>
            <p className="mt-2">
              Only schema metadata leaves provider infrastructure. Raw data is
              generated server-side after the transaction settles on-chain.
            </p>
          </div>
        </div>

        <div className="space-y-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-primary">
              Payment summary
            </p>
            <h2 className="text-3xl font-semibold text-white">Cost details</h2>
          </div>
          <div className="space-y-3 text-sm text-white/80">
            <div className="flex items-center justify-between">
              <span>Total rows</span>
              <span>{totalRows.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Price per row</span>
              <span>{pricePerRow.toFixed(3)} SOL</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Datasets included</span>
              <span>{includedDatasets.length}</span>
            </div>
            <div className="flex items-center justify-between text-lg font-semibold text-white">
              <span>Total</span>
              <span>{total.toFixed(3)} SOL</span>
            </div>
          </div>
          <Button className="h-14 gap-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 text-white">
            <Wallet2 className="h-5 w-5" />
            Connect wallet
          </Button>
          <Button
            variant="ghost"
            className="h-14 gap-2 rounded-full border border-white/20 text-white"
            asChild
          >
            <Link href="/download">
              Continue to download
              <Download className="h-4 w-4" />
            </Link>
          </Button>
          <div className="rounded-2xl border border-white/10 bg-black/50 p-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 text-white">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Trustless delivery</span>
            </div>
            <p className="mt-2">
              Quarry notarizes every slice with watermarking and audit trails so
              providers can revoke access if required.
            </p>
          </div>
          <Button variant="ghost" className="w-full text-white" asChild>
            <Link href="/agent">
              Back to agent
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

