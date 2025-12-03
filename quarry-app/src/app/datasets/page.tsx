import { Search, Tag, Upload, Wand2 } from "lucide-react";
import { datasets } from "@/data/datasets";
import { DatasetCard } from "@/components/sections/dataset-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const allTags = Array.from(new Set(datasets.flatMap((dataset) => dataset.tags)));

export default function DatasetsPage() {
  return (
    <div className="container space-y-16 py-16">
      <div className="space-y-8 rounded-[32px] border border-white/10 bg-black/40 p-10 shadow-[0_25px_80px_rgba(15,23,42,0.5)] backdrop-blur">
        <div className="space-y-4">
          <Badge variant="outline">Public data market</Badge>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold text-white">
              Browse verified schemas. Zero data leaves a vault.
            </h1>
            <p className="text-white/70 leading-relaxed">
              Search by tag, provider, or column metadata. Attach any dataset to your
              agent without touching raw rows.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="relative flex items-center rounded-[28px] border border-white/10 bg-[#11141c]/80 px-6 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03),0_25px_70px_rgba(0,0,0,0.35)]">
            <Search className="mr-3 h-5 w-5 text-white/40" />
            <input
              type="search"
              placeholder="Search by dataset, provider, or column…"
              className="flex-1 bg-transparent text-lg text-white placeholder:text-white/35 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-3 text-sm">
            {allTags.slice(0, 8).map((tag) => (
              <button
                key={tag}
                className="rounded-full border border-white/15 px-4 py-2 text-white/70 transition hover:border-primary/60 hover:text-white"
              >
                <Tag className="mr-1 inline h-3 w-3 align-middle" />
                {tag}
              </button>
            ))}
            {allTags.length > 8 && (
              <span className="rounded-full border border-dashed border-white/20 px-4 py-2 text-white/60">
                +{allTags.length - 8} more
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {datasets.map((dataset) => (
          <DatasetCard key={dataset.id} dataset={dataset} />
        ))}
      </div>

      <div className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-black/35 p-6 text-white/80 shadow-[0_20px_70px_rgba(15,23,42,0.45)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Need to list a dataset?</h2>
          <p className="text-sm text-white/70">
            Providers keep full control while exposing schema-only previews.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="ghost" className="gap-2 text-white">
            <Wand2 className="h-4 w-4" />
            Generate summary
          </Button>
          <Button className="gap-2 rounded-full bg-gradient-to-r from-primary to-blue-500 text-white" asChild>
            <a href="/providers">
              <Upload className="h-4 w-4" />
              Upload your dataset
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

