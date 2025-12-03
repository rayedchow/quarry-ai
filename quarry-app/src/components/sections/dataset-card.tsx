"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Plus, Layers, Coins } from "lucide-react";
import { Dataset } from "@/data/datasets";
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
        "group relative flex flex-col rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm transition-all duration-300",
        "hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent">
          <Image
            src={dataset.image}
            alt={dataset.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="56px"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-cyan-400/80 uppercase tracking-wider">
            {dataset.publisher}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-white truncate group-hover:text-cyan-400 transition-colors">
            {dataset.name}
          </h3>
        </div>
      </div>

      {/* Summary */}
      <p className="mt-4 text-sm text-white/50 leading-relaxed line-clamp-2">
        {dataset.summary}
      </p>

      {/* Tags */}
      <div className="mt-4 flex flex-wrap gap-2">
        {dataset.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-white/60"
          >
            {tag}
          </span>
        ))}
        {dataset.tags.length > 3 && (
          <span className="px-2 py-1 text-xs text-white/30">
            +{dataset.tags.length - 3}
          </span>
        )}
      </div>

      {/* Schema Preview */}
      <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-3">
        <div className="flex items-center justify-between text-xs text-white/40 mb-2">
          <span className="uppercase tracking-wider">Schema</span>
          <span className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            {dataset.columnCount} cols
          </span>
        </div>
        <div className="space-y-1.5">
          {dataset.schema.slice(0, compact ? 2 : 3).map((column) => (
            <div key={column.name} className="flex items-center justify-between text-sm">
              <span className="font-medium text-white/70">{column.name}</span>
              <span className="text-xs font-mono text-white/30">{column.type}</span>
            </div>
          ))}
          {dataset.schema.length > (compact ? 2 : 3) && (
            <p className="text-xs text-white/30 pt-1">+ {dataset.schema.length - (compact ? 2 : 3)} more</p>
          )}
        </div>
      </div>

      {/* Price & Meta */}
      <div className="mt-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-emerald-400/70" />
          <span className="text-lg font-semibold text-white">
            {dataset.pricePerRow.toFixed(3)}
          </span>
          <span className="text-sm text-white/40">SOL/row</span>
        </div>
        <span className="text-xs text-white/30">{dataset.updatedAt}</span>
      </div>

      {/* Actions */}
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Button
          className="btn-secondary h-10 text-sm"
          asChild
        >
          <Link href={`/agent?attach=${dataset.slug}`}>
            <Plus className="h-4 w-4" />
            Add to Agent
          </Link>
        </Button>
        <Button
          className="btn-primary h-10 text-sm"
          asChild
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
