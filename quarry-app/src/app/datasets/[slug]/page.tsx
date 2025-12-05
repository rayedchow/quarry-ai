"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Plus,
  Database,
  Clock,
  Layers,
  Coins,
  Loader2,
  AlertCircle,
  Eye,
  Table,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { api, Dataset, DataQueryResponse } from "@/lib/api";
import { ReputationPanel } from "@/components/sections/reputation-panel";
import { ReputationBadgeComponent } from "@/components/ui/reputation-badge";
import { ReviewsSection } from "@/components/sections/reviews-section";

export default function DatasetDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [preview, setPreview] = useState<DataQueryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!slug) return;

    setLoading(true);
    setError(null);

    api
      .getDataset(slug)
      .then(setDataset)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Dataset not found");
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const loadPreview = async () => {
    if (!slug || preview) return;
    setPreviewLoading(true);
    try {
      const data = await api.previewDataset(slug, 5);
      setPreview(data);
      setShowPreview(true);
    } catch (err) {
      console.error("Failed to load preview:", err);
    } finally {
      setPreviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 text-cyan-400 animate-spin mx-auto" />
          <p className="text-white/50">Loading dataset...</p>
        </div>
      </div>
    );
  }

  if (error || !dataset) {
    return (
      <div className="space-y-6 py-8">
        <Link
          href="/datasets"
          className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to marketplace
        </Link>

        <div className="glass-panel p-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Dataset not found</h2>
          <p className="text-white/50 mb-6">{error || "The requested dataset could not be found."}</p>
          <Button onClick={() => router.push("/datasets")} className="btn-primary">
            Browse datasets
          </Button>
        </div>
      </div>
    );
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
          <div className="flex-1 space-y-6">
            <div className="space-y-4">
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
                  <Link
                    key={tag}
                    href={`/datasets?tag=${encodeURIComponent(tag)}`}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/60 hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-400 transition-all"
                  >
                    {tag}
                  </Link>
                ))}
                {dataset.reputation?.badges?.slice(0, 2).map((badge, index) => (
                  <ReputationBadgeComponent key={`badge-${index}`} badge={badge} size="sm" />
                ))}
              </div>
            </div>
          </div>

          {/* Stats & Actions Card */}
          <div className="glass-panel p-6 min-w-[320px] space-y-4">
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

            <div className="space-y-3 text-sm border-t border-white/10 pt-4">
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
                <span className="text-white font-medium">
                  {dataset.pricePerRow < 0.001 
                    ? dataset.pricePerRow.toExponential(2) 
                    : dataset.pricePerRow.toFixed(3)} SOL
                </span>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4 space-y-3">
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
                <Link href={`/datasets`}>
                  Continue browsing
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Reputation Section - Full Width */}
      {dataset.reputation && (
        <div className="glass-panel p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="section-label">Verified reputation</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Quality & Trust
              </h2>
              <p className="mt-2 text-sm text-white/50">
                On-chain attestations via Solana Attestation Service
              </p>
            </div>
            {dataset.reputation.quality_score !== undefined && (
              <div className="text-right">
                <p className="text-xs text-white/40 mb-2">Quality Score</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-5xl font-bold ${
                    dataset.reputation.quality_score >= 90 ? "text-green-400" : 
                    dataset.reputation.quality_score >= 75 ? "text-yellow-400" : 
                    "text-red-400"
                  }`}>
                    {dataset.reputation.quality_score}
                  </span>
                  <span className="text-xl text-white/40">/ 100</span>
                </div>
                <p className="text-sm text-white/60 mt-1">
                  {dataset.reputation.quality_score >= 90 ? "Excellent" :
                   dataset.reputation.quality_score >= 75 ? "Good" :
                   dataset.reputation.quality_score >= 60 ? "Fair" : "Poor"}
                </p>
              </div>
            )}
          </div>
          
          <ReputationPanel reputation={dataset.reputation} />
        </div>
      )}

      {/* Content - Full Width */}
      <div className="space-y-8">
          <div className="glass-panel p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="section-label">Data structure</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Schema & Semantics
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

          {/* Reviews Section */}
          <ReviewsSection datasetId={dataset.id} datasetVersion="v1" />

          {/* Data Preview */}
          <div className="glass-panel p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="section-label">Sample data</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Data preview
                </h2>
              </div>
              <Button
                onClick={loadPreview}
                disabled={previewLoading}
                className="btn-secondary"
              >
                {previewLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                {preview ? "Refresh" : "Load Preview"}
              </Button>
            </div>

            {showPreview && preview ? (
              <div className="w-full">
                <div className="border border-white/10 rounded-lg overflow-hidden">
                  <div className="overflow-auto max-h-[500px] relative">
                    <table className="w-full text-sm table-fixed" style={{ minWidth: `${preview.columns.length * 150}px` }}>
                      <thead className="bg-white/[0.02] sticky top-0 z-10">
                        <tr className="border-b border-white/10">
                          {preview.columns.map((col) => (
                            <th
                              key={col}
                              className="px-4 py-3 text-left font-medium text-white/70 whitespace-nowrap"
                              style={{ minWidth: '150px' }}
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.map((row, i) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                            {row.map((cell, j) => (
                              <td
                                key={j}
                                className="px-4 py-3 text-white/60"
                                style={{ minWidth: '150px' }}
                              >
                                <div className="truncate" title={String(cell)}>
                                  {String(cell)}
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <p className="mt-4 text-xs text-white/40 text-center">
                  Showing {preview.returned_rows} of {preview.total_rows.toLocaleString()} rows
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center">
                <Table className="h-8 w-8 text-white/20 mx-auto mb-3" />
                <p className="text-sm text-white/40">
                  Click &quot;Load Preview&quot; to see sample data
                </p>
              </div>
            )}
          </div>
      </div>
    </div>
  );
}
