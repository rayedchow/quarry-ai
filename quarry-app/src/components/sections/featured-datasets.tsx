"use client";

import { useEffect, useState } from "react";
import { Loader2, Database } from "lucide-react";
import { api, Dataset } from "@/lib/api";
import { DatasetCard } from "./dataset-card";

export function FeaturedDatasets() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDatasets({ limit: 3 })
      .then((response) => setDatasets(response.datasets))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
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
          </div>
        ))}
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <Database className="h-12 w-12 text-white/20 mx-auto mb-4" />
        <p className="text-white/50">No datasets available yet.</p>
        <p className="text-sm text-white/30 mt-1">Be the first to publish one!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {datasets.map((dataset) => (
        <DatasetCard key={dataset.id} dataset={dataset} compact />
      ))}
    </div>
  );
}

