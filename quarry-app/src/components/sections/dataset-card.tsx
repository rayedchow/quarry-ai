"use client";

import { useAttachedDatasets } from "@/hooks/use-attached-datasets";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Plus, Layers, Coins, Check } from "lucide-react";
import { Dataset } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DatasetCardProps = {
  dataset: Dataset;
  className?: string;
  compact?: boolean;
};

// Format SOL amounts to show at least 1 significant figure
function formatSOL(amount: number): string {
  if (amount === 0) return "0";
  
  const absAmount = Math.abs(amount);
  
  // For amounts >= 1, show 4 decimals
  if (absAmount >= 1) {
    return amount.toFixed(4);
  }
  
  // For small numbers, find first non-zero digit and show at least 1 sig fig
  const decimals = Math.ceil(-Math.log10(absAmount)) + 1;
  return amount.toFixed(Math.min(decimals, 10));
}

export function DatasetCard({
  dataset,
  className,
  compact = false,
}: DatasetCardProps) {
  const { isAttached, toggleDataset, mounted } = useAttachedDatasets();
  const isSelected = isAttached(dataset.slug);

  // Avoid hydration mismatch
  if (!mounted) {
    return (
      <div
        className={cn(
          "group relative flex flex-col rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm transition-all duration-300",
          "hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]",
          className,
        )}
      >
        <div className="h-[300px] animate-pulse bg-white/5 rounded-xl" />
      </div>
    );
  }

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
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent">
          <Image
            src={dataset.image}
            alt={dataset.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="48px"
          />
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <h3 className="text-base font-semibold text-white truncate group-hover:text-cyan-400 transition-colors">
            {dataset.name}
          </h3>
          <div className="flex items-center gap-2 text-xs text-white/40 mt-1">
            <span>{dataset.rowCount} rows</span>
            <span>•</span>
            <span>{dataset.updatedAt}</span>
          </div>
        </div>
      </div>

      {/* Summary */}
      <p className="mt-3 text-sm text-white/50 leading-relaxed line-clamp-2">
        {dataset.summary || dataset.description}
      </p>

      {/* Tags */}
      <div className="mt-3 flex flex-wrap gap-2">
        {dataset.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-white/60"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Price & Actions */}
      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 text-sm">
          <Coins className="h-3.5 w-3.5 text-emerald-400/70" />
          <span className="font-medium text-white">
            {formatSOL(dataset.pricePerRow)}
          </span>
          <span className="text-white/40 text-xs">SOL/row</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-3 text-xs text-white/50 hover:text-white hover:bg-white/10"
            asChild
          >
            <Link href={`/datasets/${dataset.slug}`}>
              Details
            </Link>
          </Button>
          <Button
            size="sm"
            className={cn(
              "h-8 px-3 text-xs transition-all",
              isSelected
                ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/20"
                : "btn-secondary border border-white/10"
            )}
            onClick={() => toggleDataset(dataset.slug)}
          >
            {isSelected ? (
              <div className="flex items-center gap-1.5">
                <Check className="h-3 w-3" />
                Selected
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Plus className="h-3 w-3" />
                Add
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
