import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Bot, Plus } from "lucide-react";
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
    <div className="container space-y-12 py-16">
      <div className="flex flex-col gap-6">
        <Link
          href="/datasets"
          className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to marketplace
        </Link>
        <Badge variant="outline">Dataset details</Badge>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-primary">
              {dataset.publisher}
            </p>
            <h1 className="mt-2 text-4xl font-semibold text-white">
              {dataset.name}
            </h1>
            <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
              {dataset.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {dataset.tags.map((tag) => (
                <Badge
                  key={tag}
                  className="border border-white/10 bg-white/5 text-white/70"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-3xl border border-white/5 bg-white/[0.04] p-6 text-sm text-white/80">
            <div className="flex items-center justify-between">
              <span>Rows</span>
              <span className="text-lg font-semibold text-white">
                {dataset.rowCount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Columns</span>
              <span className="text-lg font-semibold text-white">
                {dataset.columnCount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Updated</span>
              <span className="text-white">{dataset.updatedAt}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Price per row</span>
              <span className="text-white">
                {dataset.pricePerRow.toFixed(3)} SOL
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Price per column</span>
              <span className="text-white">
                {dataset.pricePerColumn.toFixed(4)} SOL
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6 rounded-3xl border border-white/10 bg-black/40 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-white">
              Schema + semantics
            </h2>
            <Badge variant="outline" className="border-white/20">
              {dataset.columnCount} columns
            </Badge>
          </div>
          <div className="space-y-4">
            {dataset.schema.map((column) => (
              <div
                key={column.name}
                className="rounded-2xl border border-white/5 bg-white/[0.03] p-4"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white">{column.name}</span>
                  <span className="text-xs uppercase tracking-[0.3em] text-primary">
                    {column.type}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {column.semantic}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-2xl font-semibold text-white">Call to action</h2>
          <p className="text-sm text-muted-foreground">
            Add the dataset to an agent context or talk to the agent directly.
            You’ll receive a schema preview and cost estimate before executing
            any slice.
          </p>
          <div className="grid gap-3">
            <Button
              className="gap-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 text-white"
              asChild
            >
              <Link href={`/agent?attach=${dataset.slug}`}>
                <Plus className="h-4 w-4" />
                Add to Agent
              </Link>
            </Button>
            <Button
              variant="outline"
              className="gap-2 rounded-full border-white/30 text-white"
              asChild
            >
              <Link href={`/agent?chat=${dataset.slug}`}>
                <Bot className="h-4 w-4" />
                Ask Agent
              </Link>
            </Button>
            <Button variant="ghost" className="gap-2 text-white" asChild>
              <Link href="/checkout">
                Continue to checkout
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/80">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">
              Not exposed
            </p>
            <ul className="mt-2 space-y-2 text-muted-foreground">
              <li>• No sample rows</li>
              <li>• No identifiable values</li>
              <li>• No labels or payload data</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

