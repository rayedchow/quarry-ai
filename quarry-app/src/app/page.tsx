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
    <div className="flex flex-col gap-16 pb-24">
      <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-slate-950/80 px-8 py-12 shadow-[0_30px_140px_rgba(15,23,42,0.55)] backdrop-blur">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.25),transparent_60%),radial-gradient(circle_at_80%_0%,rgba(147,51,234,0.25),transparent_55%)] blur-3xl opacity-80" />
          <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
          <div className="absolute -left-16 top-24 h-48 w-48 rounded-full bg-primary/20 blur-[110px]" />
          <div className="absolute -right-10 bottom-10 h-32 w-32 rounded-full bg-cyan-400/30 blur-[100px]" />
        </div>
        <div className="relative z-10 grid gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-8">
            <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-medium uppercase tracking-[0.4em] text-primary">
              Secure Data Exchange
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
                Schema-only browsing built for calm decision making.
              </h1>
              <p className="text-base text-white/70">
                Quarry AI narrows the surface area down to what matters: clean
                schema previews, lightweight agent orchestration, and instant
                handoff into your own secure workflows.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                className="rounded-full px-6 py-5 text-sm font-semibold"
                asChild
              >
                <Link href="/datasets">
                  Explore datasets
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                className="rounded-full px-6 py-5 text-sm font-semibold"
                asChild
              >
                <Link href="/agent">
                  Launch agent
                </Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {heroStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-blue/10 bg-gradient-to-br from-blue/10 via-blue/5 to-transparent/10 p-4 shadow-[0_10px_40px_rgba(15,23,42,0.35)]"
                >
                  <p className="text-2xl font-semibold text-white">
                    {stat.value}
                  </p>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/40 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.5)] backdrop-blur">
            <p className="text-xs uppercase tracking-[0.4em] text-primary">
              Schema preview
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              Calm orchestration snapshot
            </h2>
            <p className="mt-2 text-sm text-white/60">
              A single glance shows what the agent is about to join, price, and
              deliver.
            </p>
            <div className="mt-6 space-y-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              {[
                "user_hash",
                "session_duration",
                "cart_items",
                "loyalty_tier",
              ].map((column) => (
                <div
                  key={column}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-black/40 px-4 py-3 text-sm text-white/80"
                >
                  <span>{column}</span>
                  <span className="text-xs text-white/50">string</span>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-gradient-to-br from-primary/30 to-blue-500/20 p-5 text-sm text-white">
              <p className="text-xs uppercase tracking-[0.4em] text-white/70">
                Agent says
              </p>
              <p className="mt-2 leading-relaxed text-white">
                “Joining loyalty tiers from{" "}
                <span className="text-primary">Global E-commerce</span> with
                churn cohorts from{" "}
                <span className="text-primary">Streaming Sentiment</span>.
                Estimated slice cost 2,000 rows × 0.002 SOL.”
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="agent-flow"
        className="relative overflow-hidden rounded-[32px] border border-white/10 bg-black/40 p-8 shadow-[0_20px_90px_rgba(15,23,42,0.45)] lg:grid-cols-[0.65fr_1.35fr]"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/40 to-transparent" />
          <div className="absolute right-6 top-6 h-24 w-24 rounded-full bg-purple-500/20 blur-[90px]" />
        </div>
        <div className="relative z-10 grid gap-10 lg:grid-cols-[0.65fr_1.35fr]">
          <div className="space-y-4">
            <Badge variant="outline">Agent workflow</Badge>
            <h2 className="text-3xl font-semibold text-white">
              Four moments before a slice is approved.
            </h2>
            <p className="text-sm text-white/70">
              The agent pauses between each step so buyers can review the plan,
              edit context, and only move forward when it is crystal clear.
            </p>
          </div>
          <div className="space-y-4">
            {workflowSteps.map((step, index) => (
              <div
                key={step.title}
                className="flex gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-5 backdrop-blur"
              >
                <span className="text-sm font-semibold text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-lg font-semibold text-white">
                    {step.title}
                  </p>
                  <p className="mt-1 text-sm text-white/60">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative space-y-8 overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/60 p-8 shadow-[0_15px_60px_rgba(15,23,42,0.45)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          <div className="absolute bottom-[-40px] right-[-20px] h-40 w-40 rounded-full bg-emerald-400/20 blur-[90px]" />
        </div>
        <div className="relative z-10 space-y-3">
          <Badge variant="outline">Schema-only benefits</Badge>
          <h2 className="text-3xl font-semibold text-white">
            Privacy posture legal, risk, and ops teams agree on.
          </h2>
          <p className="text-sm text-white/70">
            Each preview shows just enough signal to evaluate usefulness while
            keeping providers in complete control.
          </p>
        </div>
        <div className="relative z-10 grid gap-4 md:grid-cols-3">
          {schemaBenefits.map((benefit) => (
            <div
              key={benefit.title}
              className="rounded-3xl border border-white/10 bg-black/40 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.4)]"
            >
              <benefit.icon className="h-10 w-10 text-primary" />
              <p className="mt-4 text-lg font-semibold text-white">
                {benefit.title}
              </p>
              <p className="mt-2 text-sm text-white/70">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative space-y-8 overflow-hidden rounded-[32px] border border-white/10 bg-black/35 p-8 shadow-[0_15px_70px_rgba(15,23,42,0.4)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-primary/40 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_10%,rgba(148,163,184,0.15),transparent_55%)]" />
        </div>
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge variant="outline">Public marketplace</Badge>
            <h2 className="mt-3 text-3xl font-semibold text-white">
              Explore live schemas curated for AI agents.
            </h2>
            <p className="text-sm text-white/70">
              Lightweight summaries, type-safe previews, and one-click adds to
              your agent cart.
            </p>
          </div>
          <Button variant="ghost" className="text-white" asChild>
            <Link href="/datasets">
              View marketplace
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="relative z-10 grid gap-6 lg:grid-cols-3">
          {featuredDatasets.map((dataset) => (
            <DatasetCard key={dataset.id} dataset={dataset} compact />
          ))}
        </div>
      </section>

      <section className="relative grid gap-8 overflow-hidden rounded-[36px] border border-white/10 bg-gradient-to-br from-blue-600/25 via-slate-900/70 to-purple-600/20 p-8 text-white shadow-[0_25px_90px_rgba(15,23,42,0.55)] lg:grid-cols-2">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-10 top-12 h-[1px] bg-gradient-to-r from-cyan-400/0 via-white/50 to-purple-400/0" />
          <div className="absolute left-1/4 top-0 h-32 w-32 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute right-0 bottom-0 h-40 w-40 rounded-full bg-purple-500/30 blur-[110px]" />
        </div>
        <div className="relative z-10 space-y-4">
          <Badge className="border-white/30 bg-white/10 text-white">
            Upload dataset
          </Badge>
          <h2 className="text-3xl font-semibold">
            Providers monetize safely with schema-only onboarding.
          </h2>
          <p className="text-sm text-white/80">
            Bring any warehouse or stream. Our q-operator deploys the mirror,
            enforces privacy guarantees, and lets you revoke access instantly.
          </p>
          <ul className="space-y-3 text-sm text-white/70">
            <li>• Automatic schema diffing & semantic labeling</li>
            <li>• Wallet-gated payouts in SOL or stablecoins</li>
            <li>• Full audit trail with revocation controls</li>
          </ul>
          <div className="flex flex-wrap gap-4">
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
        <div className="relative z-10 rounded-[28px] border border-white/20 bg-black/40 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.5)] backdrop-blur">
          <p className="text-xs uppercase tracking-[0.4em] text-white/60">
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
              )
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

      <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-black/30 shadow-[0_20px_80px_rgba(15,23,42,0.4)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(148,163,184,0.2),transparent_55%)]" />
        <div className="relative z-10">
          <BackgroundPaths title="Schema Only Assurance Layer" />
        </div>
      </section>
    </div>
  );
}
