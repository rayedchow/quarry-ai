import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, FileLock2, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function DownloadPage() {
  return (
    <div className="container space-y-10 py-16">
      <Link
        href="/checkout"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to checkout
      </Link>
      <div className="space-y-3">
        <Badge variant="outline">Download center</Badge>
        <h1 className="text-4xl font-semibold text-white">
          Your encrypted slice is ready.
        </h1>
        <p className="text-muted-foreground">
          The requested projection has been generated server-side and sealed
          with a one-time key. Download within 24 hours or regenerate from the
          agent.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6 rounded-3xl border border-white/10 bg-black/40 p-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-white/80">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-primary">
                  File metadata
                </p>
                <h2 className="text-2xl font-semibold text-white">
                  Slice #7f09d
                </h2>
              </div>
              <Badge className="bg-white/10 text-white">Encrypted</Badge>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Size</span>
                <span>87 MB</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Format</span>
                <span>Parquet · gzip</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Expires</span>
                <span>24h</span>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/60 p-5 text-sm text-muted-foreground">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">
              Included columns
            </p>
            <ul className="mt-3 space-y-2 text-white/80">
              <li>• loyalty_tier (string)</li>
              <li>• churn_flag (bool)</li>
              <li>• sentiment_score (float)</li>
              <li>• wait_time_min (int)</li>
            </ul>
          </div>
        </div>

        <div className="space-y-6 rounded-3xl border border-white/10 bg-white/[0.02] p-6">
          <div className="rounded-2xl border border-white/10 bg-black/50 p-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 text-white">
              <FileLock2 className="h-5 w-5 text-primary" />
              <span>Download key</span>
            </div>
            <p className="mt-2">
              Use the provided wallet signature to decrypt once. Future access
              requires regenerating from the Agent page.
            </p>
          </div>
          <Button className="h-14 gap-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 text-white">
            <Download className="h-4 w-4" />
            Download slice
          </Button>
          <Button variant="ghost" className="rounded-full text-white" asChild>
            <Link href="/agent">Return to agent</Link>
          </Button>
          <div className="rounded-2xl border border-white/10 bg-black/60 p-5 text-sm text-white/80">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span>Audit trail</span>
            </div>
            <p className="mt-2">
              Every download is immutably logged with dataset chips, wallet ID,
              and watermark hash for revocation-ready compliance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

