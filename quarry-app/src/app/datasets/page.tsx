import { Search, Tag, Upload, Wand2 } from "lucide-react";
import { datasets } from "@/data/datasets";
import { DatasetCard } from "@/components/sections/dataset-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const allTags = Array.from(new Set(datasets.flatMap((dataset) => dataset.tags)));

export default function DatasetsPage() {
  return (
    <div className="container space-y-12 py-16">
      <div className="space-y-6">
        <Badge variant="outline">Public data market</Badge>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-semibold text-white">
              Browse verified schemas. Zero data leaves a vault.
            </h1>
            <p className="mt-2 text-muted-foreground">
              Search by tag, provider, or column metadata. Add any dataset to
              your agent without touching raw rows.
            </p>
          </div>
          <div className="flex gap-4">
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
        <div className="flex flex-col gap-4 rounded-3xl border border-white/5 bg-black/40 p-6 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
            <input
              type="search"
              placeholder="Search by tag, provider, or column..."
              className="h-14 w-full rounded-2xl border border-white/10 bg-black/30 pl-12 pr-4 text-white outline-none ring-primary/50 placeholder:text-white/40 focus:ring"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {allTags.slice(0, 6).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="border-white/20 text-white/70"
              >
                <Tag className="mr-1 h-3 w-3" />
                {tag}
              </Badge>
            ))}
            <Badge variant="outline" className="border-dashed border-white/30">
              +{Math.max(allTags.length - 6, 0)} more
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {datasets.map((dataset) => (
          <DatasetCard key={dataset.id} dataset={dataset} />
        ))}
      </div>
    </div>
  );
}

