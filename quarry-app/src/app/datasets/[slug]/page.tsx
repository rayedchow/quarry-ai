import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Bot, Plus, Database, Clock, Layers, Coins } from "lucide-react";
import Link from "next/link";
import { getDatasetBySlug, datasets } from "@/data/datasets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type DatasetDetailsPageProps = {
  params: { slug: string };
};

export function generateStaticParams() {
  return datasets.map((dataset) => ({ slug: dataset.slug }));
}

export default function DatasetDetailsPage({ params }: DatasetDetailsPageProps) {
  const { slug } = params;
  const dataset = getDatasetBySlug(slug);

  if (!dataset) {
    notFound();
  }

  return (
    <div className="space-y-12 py-8">
      {/* Navigation & Hero */}
      <div className="space-y-6">
        <Link
          href="/datasets"
          className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to marketplace
        </Link>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-1.5">
              <Database className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs font-medium text-cyan-400">{dataset.publisher}</span>
            </div>

            <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
              {dataset.name}
            </h1>

            <p className="max-w-2xl text-lg text-white/60 leading-relaxed">
              {dataset.description}
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              {dataset.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/60"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Quick Stats Card */}
          <div className="glass-panel p-6 min-w-[280px] space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-white/[0.03] p-4 text-center">
                <Layers className="h-5 w-5 text-cyan-400 mx-auto mb-2" />
                <p className="text-xl font-semibold text-white">{dataset.rowCount}</p>
                <p className="text-xs text-white/40 mt-1">Rows</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-4 text-center">
                <Database className="h-5 w-5 text-violet-400 mx-auto mb-2" />
                <p className="text-xl font-semibold text-white">{dataset.columnCount}</p>
                <p className="text-xs text-white/40 mt-1">Columns</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-white/50 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Updated
                </span>
                <span className="text-white">{dataset.updatedAt}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50 flex items-center gap-2">
                  <Coins className="h-4 w-4" />
                  Per row
                </span>
                <span className="text-white font-medium">{dataset.pricePerRow.toFixed(3)} SOL</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50 flex items-center gap-2">
                  <Coins className="h-4 w-4" />
                  Per column
                </span>
                <span className="text-white font-medium">{dataset.pricePerColumn.toFixed(4)} SOL</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Schema */}
        <div className="glass-panel p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="section-label">Data structure</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Schema + semantics
              </h2>
            </div>
            <div className="stat-chip">
              <span className="text-white">{dataset.columnCount}</span>
              <span className="text-white/40">columns</span>
            </div>
          </div>

          <div className="space-y-3">
            {dataset.schema.map((column, index) => (
              <div
                key={column.name}
                className="glass-card p-4 flex items-start gap-4"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-xs font-medium text-white/40">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{column.name}</span>
                    <span className="text-xs text-white/30 font-mono">{column.type}</span>
                  </div>
                  <p className="mt-1 text-sm text-white/50 leading-relaxed">
                    {column.semantic}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="glass-panel p-8 space-y-6">
          <div>
            <p className="section-label">Take action</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Get started</h2>
          </div>

          <p className="text-sm text-white/50 leading-relaxed">
            Add the dataset to an agent context or talk to the agent directly.
            You'll receive a schema preview and cost estimate before executing
            any slice.
          </p>

          <div className="space-y-3">
            <Button
              className="btn-primary w-full h-12"
              asChild
            >
              <Link href={`/agent?attach=${dataset.slug}`}>
                <Plus className="h-4 w-4" />
                Add to Agent
              </Link>
            </Button>

            <Button
              className="btn-secondary w-full h-12"
              asChild
            >
              <Link href={`/agent?chat=${dataset.slug}`}>
                <Bot className="h-4 w-4" />
                Ask Agent
              </Link>
            </Button>

            <Button variant="ghost" className="w-full text-white/60 hover:text-white" asChild>
              <Link href="/checkout">
                Continue to checkout
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
            <p className="section-label mb-3">Privacy guarantee</p>
            <div className="space-y-2 text-sm text-white/40">
              <p className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-emerald-400" />
                No sample rows exposed
              </p>
              <p className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-emerald-400" />
                No identifiable values
              </p>
              <p className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-emerald-400" />
                No labels or payload data
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
