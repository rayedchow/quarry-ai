"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Tag, Upload, Database, Loader2, AlertCircle } from "lucide-react";
import { DatasetCard } from "@/components/sections/dataset-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { api, Dataset, TagsResponse } from "@/lib/api";

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [tags, setTags] = useState<TagsResponse>({ tags: [], counts: {} });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch tags
  useEffect(() => {
    api.getTags()
      .then(setTags)
      .catch((err) => console.error("Failed to fetch tags:", err));
  }, []);

  // Fetch datasets
  const fetchDatasets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getDatasets({
        search: debouncedSearch || undefined,
        tag: selectedTag || undefined,
        limit: 100,
      });
      setDatasets(response.datasets);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch datasets");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedTag]);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const handleTagClick = (tag: string) => {
    setSelectedTag(selectedTag === tag ? null : tag);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTag(null);
  };

  const hasActiveFilters = searchQuery || selectedTag;

  return (
    <div className="space-y-12 py-8">
      {/* Hero Section */}
      <div className="glass-panel p-8 md:p-10 space-y-8">
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white">
            <span className="text-gradient-accent">Datasets</span>
          </h1>

          <p className="max-w-2xl text-white/60 leading-relaxed">
            Search by tag, provider, or column metadata.
          </p>
        </div>

        {/* Search */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by dataset, provider, or column…"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] pl-14 pr-6 py-4 text-white placeholder:text-white/30 focus:border-cyan-500/50 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 transition-all"
            />
            {loading && (
              <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-cyan-400 animate-spin" />
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {tags.tags.slice(0, 8).map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={`group flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-all ${
                  selectedTag === tag
                    ? "border-cyan-500/60 bg-cyan-500/20 text-cyan-400"
                    : "border-white/10 bg-white/[0.03] text-white/60 hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-400"
                }`}
              >
                <Tag className="h-3 w-3" />
                {tag}
                {tags.counts[tag] && (
                  <span className="ml-1 text-xs opacity-60">({tags.counts[tag]})</span>
                )}
              </button>
            ))}
            {tags.tags.length > 8 && (
              <span className="flex items-center rounded-full border border-dashed border-white/10 px-3.5 py-2 text-sm text-white/40">
                +{tags.tags.length - 8} more
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/40">Active filters:</span>
              {selectedTag && (
                <button
                  onClick={() => setSelectedTag(null)}
                  className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-400"
                >
                  {selectedTag}
                  <span className="ml-1">×</span>
                </button>
              )}
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-400"
                >
                  &quot;{searchQuery}&quot;
                  <span className="ml-1">×</span>
                </button>
              )}
              <button
                onClick={clearFilters}
                className="text-xs text-white/40 hover:text-white transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dataset Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm text-white/40">
            {total} {total === 1 ? 'dataset' : 'datasets'}
          </span>
        </div>

        {error && (
          <div className="glass-panel p-6 mb-6 border-red-500/20 bg-red-500/5">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Failed to load datasets</p>
                <p className="text-sm text-red-400/70">{error}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchDatasets}
                className="ml-auto text-red-400 hover:text-red-300"
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {loading && datasets.length === 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 animate-pulse"
              >
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-20 bg-white/10 rounded" />
                    <div className="h-5 w-32 bg-white/10 rounded" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-4 bg-white/10 rounded" />
                  <div className="h-4 w-3/4 bg-white/10 rounded" />
                </div>
                <div className="mt-4 flex gap-2">
                  <div className="h-6 w-16 bg-white/10 rounded-full" />
                  <div className="h-6 w-16 bg-white/10 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : datasets.length === 0 ? (
          <div className="glass-panel p-12 text-center">
            <Database className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No datasets found</h3>
            <p className="text-white/50 mb-6">
              {hasActiveFilters
                ? "Try adjusting your search or filters"
                : "Be the first to publish a dataset!"}
            </p>
            {hasActiveFilters ? (
              <Button onClick={clearFilters} className="btn-secondary">
                Clear filters
              </Button>
            ) : (
              <Button asChild className="btn-primary">
                <Link href="/datasets/publish">
                  <Upload className="h-4 w-4" />
                  Upload your dataset
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {datasets.map((dataset) => (
              <DatasetCard key={dataset.id} dataset={dataset} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
