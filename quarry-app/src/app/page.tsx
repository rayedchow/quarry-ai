import Link from "next/link";
import { ArrowRight, Cpu, ShieldCheck, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DatasetCard } from "@/components/sections/dataset-card";
import { datasets } from "@/data/datasets";
import { BackgroundPaths } from "@/components/ui/background-paths";

const heroStats = [
  { label: "Schemas hosted", value: "1,240+" },
  { label: "Providers onboarded", value: "86" },
  { label: "Agent slices delivered", value: "4.2M" },
];

const workflowSteps = [
  {
    title: "Attach schema chips",
    description:
      "Pick datasets from marketplace without ever exposing raw rows.",
  },
  {
    title: "Describe slice",
    description:
      "Ask the Quarry Agent for any projection, join, or filter across sets.",
  },
  {
    title: "Preview + price",
    description:
      "AI explains fields, columns, and projected cost before anything runs.",
  },
  {
    title: "Trustless delivery",
    description:
      "After payment, the encrypted slice streams directly to your secure vault.",
  },
];

const schemaBenefits = [
  {
    icon: ShieldCheck,
    title: "Zero-row exposure",
    description:
      "Only column names, types, and AI semantics leave a provider's VPC.",
  },
  {
    icon: Sparkles,
    title: "Semantic guidance",
    description:
      "Columns are annotated in plain language so teams know exactly what they buy.",
  },
  {
    icon: Cpu,
    title: "Inference ready",
    description:
      "Slice definitions compile to reproducible, server-side compute plans.",
  },
];

const featuredDatasets = datasets.slice(0, 3);

export default function Home() {
  return (
    <div className="space-y-28 pb-32">
      <section className="relative overflow-hidden">
        <div className="container grid gap-12 py-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8">
            <Badge className="border border-primary/30 bg-primary/20 text-primary-foreground">
              Secure Data Exchange
            </Badge>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              The future of schema-only browsing and multi-dataset automation.
            </h1>
            <p className="text-lg text-muted-foreground">
              Quarry AI gives GTM, quant, and ops teams AI-driven access to the
              data they need. Browse public schemas, orchestrate multi-dataset
              agents, and deliver trustless slices straight into your stack.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button
                className="min-w-[200px] justify-between rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 px-8 py-6 text-base font-semibold text-white shadow-glow"
                asChild
              >
                <Link href="/datasets">
                  Browse datasets
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                className="min-w-[200px] justify-between rounded-full border-white/30 bg-white/5 px-8 py-6 text-base text-white"
                asChild
              >
                <Link href="/agent">
                  Launch multi-agent
                  <Sparkles className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {heroStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/5 bg-white/[0.04] p-4"
                >
                  <p className="text-3xl font-semibold text-white">
                    {stat.value}
                  </p>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/40 p-6 shadow-[0_30px_120px_rgba(15,23,42,0.45)] backdrop-blur">
            <p className="text-sm uppercase tracking-[0.4em] text-primary">
              Schema preview
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              AI Agent Orchestration
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Example of the Quarry agent explaining a slice request across
              multiple providers.
            </p>
            <div className="mt-6 grid gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              {["user_hash", "session_duration", "cart_items", "loyalty_tier"].map(
                (column) => (
                  <div
                    key={column}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-black/30 px-4 py-3 text-sm text-white/80"
                  >
                    <span>{column}</span>
                    <span className="text-xs text-muted-foreground">string</span>
                  </div>
                ),
              )}
            </div>
            <div className="mt-6 rounded-2xl border border-white/5 bg-gradient-to-br from-primary/30 to-blue-500/10 p-5 text-sm text-white">
              <p className="text-xs uppercase tracking-[0.4em] text-white/70">
                Agent says
              </p>
              <p className="mt-2 text-base text-white">
                “I can join loyalty tiers from <span className="text-primary">Global
                E-commerce</span> with churn cohorts from <span className="text-primary">Streaming
                Sentiment</span>. Estimated slice cost 2,000 rows × 0.002 SOL.”
              </p>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/3 top-8 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-blue-500/25 blur-[160px]" />
          <div className="absolute right-10 top-1/2 h-[320px] w-[320px] rounded-full bg-violet-500/20 blur-[180px]" />
        </div>
      </section>

      <section
        id="agent-flow"
        className="container rounded-[32px] border border-white/5 bg-black/40 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.45)]"
      >
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="lg:w-1/3">
            <Badge variant="outline">Agent Workflow</Badge>
            <h2 className="mt-4 text-3xl font-semibold text-white">
              How the Quarry agent orchestrates data slices.
            </h2>
            <p className="mt-2 text-muted-foreground">
              Every agent session has a context window for attached datasets,
              schema-only previews, and a multi-step reasoning plan before any
              SOL leaves your wallet.
            </p>
          </div>
          <div className="grid flex-1 gap-4 md:grid-cols-2">
            {workflowSteps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-2xl border border-white/5 bg-white/[0.03] p-5"
              >
                <div className="text-xs uppercase tracking-[0.4em] text-white/50">
                  Step {index + 1}
                </div>
                <p className="mt-3 text-lg font-semibold text-white">
                  {step.title}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <Badge variant="outline">Schema-only benefits</Badge>
            <h2 className="mt-4 text-4xl font-semibold text-white">
              Privacy-preserving previews built for legal, risk, and ops teams.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Each dataset exposes column names, typing, and semantic intent —
              nothing else. Clients see enough to evaluate quality, while
              providers keep raw rows guarded until purchase is approved.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {schemaBenefits.map((benefit) => (
              <div
                key={benefit.title}
                className="rounded-3xl border border-white/5 bg-white/[0.03] p-5"
              >
                <benefit.icon className="h-10 w-10 text-primary" />
                <p className="mt-4 text-lg font-semibold text-white">
                  {benefit.title}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container space-y-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge variant="outline">Public marketplace</Badge>
            <h2 className="mt-4 text-4xl font-semibold text-white">
              Explore live schemas curated for AI agents.
            </h2>
            <p className="text-muted-foreground">
              Generated summaries, type-safe schema previews, and instant “Add to
              Agent” actions for every listing.
            </p>
          </div>
          <Button variant="ghost" className="text-white" asChild>
            <Link href="/datasets">
              View marketplace
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {featuredDatasets.map((dataset) => (
            <DatasetCard key={dataset.id} dataset={dataset} compact />
          ))}
        </div>
      </section>

      <section className="container grid gap-8 rounded-[32px] border border-white/10 bg-gradient-to-br from-blue-600/30 to-purple-600/20 p-8 text-white lg:grid-cols-2">
        <div>
          <Badge className="border-white/30 bg-white/10 text-white">
            Upload dataset
          </Badge>
          <h2 className="mt-4 text-4xl font-semibold">
            Providers: monetize safely with schema-only onboarding.
          </h2>
          <p className="mt-3 text-white/80">
            Bring any warehouse, lakehouse, or stream. Our q-operator deploys a
            schema mirror, enforces k-anonymity and differential privacy, and
            keeps the entire pipeline reversible.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-white/80">
            <li>• Automatic schema diffing + semantic labeling</li>
            <li>• Wallet-gated, usage-based payouts in SOL or stablecoins</li>
            <li>• Audit trail + revocation controls baked in</li>
          </ul>
          <div className="mt-8 flex gap-4">
            <Button
              className="gap-2 rounded-full bg-white/90 px-8 text-slate-900"
              asChild
            >
              <Link href="/providers">
                <Upload className="h-4 w-4" />
                Upload dataset
              </Link>
            </Button>
            <Button variant="ghost" className="text-white" asChild>
              <Link href="/providers#docs">View provider docs</Link>
            </Button>
          </div>
        </div>
        <div className="rounded-[28px] border border-white/20 bg-black/50 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.6)]">
          <p className="text-sm uppercase tracking-[0.4em] text-white/60">
            Multi-dataset agent preview
          </p>
          <div className="mt-4 space-y-3">
            {["Global E-Commerce", "DeFi Graph", "Healthcare Triage"].map(
              (name) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <span>{name}</span>
                  <Badge className="bg-white/20 text-white">attached</Badge>
                </div>
              ),
            )}
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">
              Cost estimate
            </p>
            <div className="mt-2 flex items-center justify-between text-2xl font-semibold text-white">
              <span>2,000 rows</span>
              <span>0.004 SOL</span>
            </div>
            <p className="mt-2 text-xs text-white/60">
              Pricing combines row count, selected columns, and provider-set
              multipliers.
            </p>
          </div>
        </div>
      </section>

      <section className="container overflow-hidden rounded-[40px] border border-white/5">
        <BackgroundPaths title="Schema Only Assurance Layer" />
      </section>
    </div>
  );
}
