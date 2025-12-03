import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { Dataset } from "@/data/datasets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DatasetCardProps = {
  dataset: Dataset;
  className?: string;
  compact?: boolean;
};

export function DatasetCard({
  dataset,
  className,
  compact = false,
}: DatasetCardProps) {
  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-3xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent/10 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.35)] backdrop-blur hover:border-primary/40 hover:shadow-glow",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
          <Image
            src={dataset.image}
            alt={dataset.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="64px"
          />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary/80">
            {dataset.publisher}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            {dataset.name}
          </h3>
          <p className="mt-2 text-sm text-white/70">{dataset.summary}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {dataset.tags.map((tag) => (
          <Badge key={tag} className="border border-white/10 bg-white/5">
            {tag}
          </Badge>
        ))}
      </div>

      <div className="mt-6 grid gap-3 rounded-2xl border border-white/5 bg-black/30 p-4">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/60">
          Schema Preview
          <span>{dataset.columnCount} columns</span>
        </div>
        <div className="space-y-2">
          {dataset.schema.slice(0, compact ? 2 : 3).map((column) => (
            <div
              key={column.name}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm"
            >
              <span className="font-medium text-white/80">{column.name}</span>
              <span className="font-mono text-xs text-primary/70">
                {column.type}
              </span>
            </div>
          ))}
          {dataset.schema.length > (compact ? 2 : 3) && (
            <p className="text-xs text-white/50">+ more columns</p>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-2 text-sm text-muted-foreground">
        <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-2">
          <span>Price / row</span>
          <span className="font-semibold text-white">
            {dataset.pricePerRow.toFixed(3)} SOL
          </span>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-2">
          <span>Updated</span>
          <span className="font-semibold text-white">{dataset.updatedAt}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button
          variant="outline"
          asChild
          className="w-full justify-center gap-2 rounded-full border-white/20 text-white/80 transition hover:text-white"
        >
          <Link href={`/agent?attach=${dataset.slug}`}>
            <Plus className="h-4 w-4" />
            Add to Agent
          </Link>
        </Button>
        <Button
          asChild
          className="w-full justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-400 text-white shadow-glow transition hover:-translate-y-0.5"
        >
          <Link href={`/datasets/${dataset.slug}`}>
            View details
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

