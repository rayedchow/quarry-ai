import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  Cpu,
  ShieldCheck,
  Sparkles,
  Upload,
  Zap,
  Lock,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeaturedDatasets } from "@/components/sections/featured-datasets";
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
    icon: Database,
  },
  {
    title: "Describe slice",
    description:
      "Ask the Quarry Agent for any projection, join, or filter across sets.",
    icon: Sparkles,
  },
  {
    title: "Preview + price",
    description:
      "AI explains fields, columns, and projected cost before anything runs.",
    icon: Zap,
  },
  {
    title: "Trustless delivery",
    description:
      "After payment, the encrypted slice streams directly to your secure vault.",
    icon: Lock,
  },
];

const schemaBenefits = [
  {
    icon: ShieldCheck,
    title: "Zero-row exposure",
    description:
      "Only column names, types, and AI semantics leave a provider's VPC.",
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    icon: Sparkles,
    title: "Semantic guidance",
    description:
      "Columns are annotated in plain language so teams know exactly what they buy.",
    gradient: "from-violet-500 to-fuchsia-500",
  },
  {
    icon: Cpu,
    title: "Inference ready",
    description:
      "Slice definitions compile to reproducible, server-side compute plans.",
    gradient: "from-amber-500 to-orange-500",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-20 pb-32 pt-4">
      {/* Hero Section */}
      <section className="glass-panel relative overflow-hidden px-8 py-16 md:px-12">
        {/* Ambient Effects */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_20%_20%,rgba(56,189,248,0.15),transparent),radial-gradient(ellipse_50%_30%_at_80%_10%,rgba(147,51,234,0.2),transparent)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>

        <div className="relative z-10 grid gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs font-medium text-cyan-400">Secure Data Exchange</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
                Schema-only browsing
                <br />
                <span className="text-gradient-accent">built for calm decisions.</span>
              </h1>
              <p className="text-lg text-white/60 leading-relaxed">
                Quarry AI narrows the surface area down to what matters: clean
                schema previews, lightweight agent orchestration, and instant
                handoff into your own secure workflows.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Button className="btn-primary h-12 px-8" asChild>
                <Link href="/datasets">
                  Explore datasets
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button className="btn-secondary h-12 px-8" asChild>
                <Link href="/agent">Launch agent</Link>
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {heroStats.map((stat) => (
                <div
                  key={stat.label}
                  className="glass-card p-5"
                >
                  <p className="text-3xl font-bold text-white">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wider text-white/40">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Preview Panel */}
          <div className="glass-panel p-6 space-y-6">
            <div>
              <p className="section-label">Schema preview</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Calm orchestration snapshot
              </h2>
              <p className="mt-1 text-sm text-white/50">
                A condensed summary of the slice the agent is prepping.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
              <div className="flex items-center justify-between text-xs uppercase tracking-wider text-white/40 mb-4">
                <span>Agent data</span>
                <span className="text-white font-medium">{heroStats[2].value}</span>
              </div>
              <div className="space-y-2">
                {[
                  "Global E-commerce",
                  "Streaming Sentiment",
                  "Healthcare Triage",
                ].map((dataset) => (
                  <div
                    key={dataset}
                    className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3 text-sm"
                  >
                    <span className="text-white/80">{dataset}</span>
                    <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-xs font-medium text-cyan-400">
                      attached
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <details className="group rounded-2xl border border-white/5 bg-white/[0.02] p-5">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-white">
                View slice plan
                <ChevronDown className="h-4 w-4 text-white/40 transition group-open:rotate-180" />
              </summary>
              <div className="mt-4 space-y-2">
                {[
                  { name: "user_hash", type: "string" },
                  { name: "session_duration", type: "int" },
                  { name: "cart_items", type: "array" },
                  { name: "loyalty_tier", type: "string" },
                ].map((column) => (
                  <div
                    key={column.name}
                    className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5"
                  >
                    <span className="text-sm text-white/70">{column.name}</span>
                    <span className="text-xs font-mono text-white/30">{column.type}</span>
                  </div>
                ))}
                <div className="mt-3 rounded-xl bg-gradient-to-br from-cyan-500/10 to-violet-500/10 border border-white/5 p-4">
                  <p className="text-xs uppercase tracking-wider text-white/40 mb-2">
                    Agent note
                  </p>
                  <p className="text-sm text-white/70 leading-relaxed">
                    &quot;Joining loyalty tiers from{" "}
                    <span className="text-cyan-400">Global E-commerce</span> with
                    churn cohorts from{" "}
                    <span className="text-violet-400">Streaming Sentiment</span>.
                    Estimated slice cost 2,000 rows × 0.002 SOL.&quot;
                  </p>
                </div>
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* Agent Workflow */}
      <section className="glass-panel p-8 md:p-10">
        <div className="grid gap-12 lg:grid-cols-[0.55fr_1.45fr]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5">
              <Zap className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-xs font-medium text-violet-400">Agent Workflow</span>
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-white">
              Four moments before
              <br />a slice is approved.
            </h2>
            <p className="text-white/50 leading-relaxed">
              The agent pauses between each step so buyers can review the plan,
              edit context, and only move forward when everything is crystal
              clear.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {workflowSteps.map((step, index) => (
              <div
                key={step.title}
                className="glass-card p-5 flex gap-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-white/10">
                  <step.icon className="h-5 w-5 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-white/30">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <p className="text-base font-semibold text-white">
                      {step.title}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-white/50 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Schema Benefits */}
      <section className="glass-panel p-8 md:p-10 space-y-10">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">Schema-only Benefits</span>
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-white">
            Privacy posture legal, risk,
            <br />and ops teams agree on.
          </h2>
          <p className="text-white/50 max-w-2xl">
            Each preview shows just enough signal to evaluate usefulness while
            keeping providers in complete control.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {schemaBenefits.map((benefit) => (
            <div
              key={benefit.title}
              className="glass-card p-6 space-y-4"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${benefit.gradient}`}>
                <benefit.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                {benefit.title}
              </h3>
              <p className="text-sm text-white/50 leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Datasets */}
      <section className="glass-panel p-8 md:p-10 space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-1.5">
              <Database className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs font-medium text-cyan-400">Public Marketplace</span>
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-white">
              Explore live schemas curated for AI agents.
            </h2>
            <p className="text-white/50">
              Lightweight summaries, type-safe previews, and one-click adds to
              your agent cart.
            </p>
          </div>
          <Button className="btn-secondary" asChild>
            <Link href="/datasets">
              View marketplace
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <FeaturedDatasets />
      </section>

      {/* Provider CTA */}
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] p-8 md:p-10">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-violet-500/10 to-fuchsia-500/20" />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-3xl" />

        <div className="relative z-10 grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5">
              <Upload className="h-3.5 w-3.5 text-white" />
              <span className="text-xs font-medium text-white">For Providers</span>
            </div>
            <h2 className="text-3xl font-semibold text-white">
              Monetize safely with
              <br />schema-only onboarding.
            </h2>
            <p className="text-white/60 leading-relaxed">
              Bring any warehouse or stream. Our q-operator deploys the mirror,
              enforces privacy guarantees, and lets you revoke access instantly.
            </p>
            <ul className="space-y-2 text-sm text-white/50">
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-cyan-400" />
                Automatic schema diffing & semantic labeling
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-cyan-400" />
                Wallet-gated payouts in SOL or stablecoins
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-cyan-400" />
                Full audit trail with revocation controls
              </li>
            </ul>
            <div className="flex flex-wrap gap-4 pt-2">
              <Button className="h-12 rounded-full bg-white px-8 text-slate-900 font-semibold hover:bg-white/90" asChild>
                <Link href="/datasets/publish">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload dataset
                </Link>
              </Button>
              <Button variant="ghost" className="h-12 text-white/80 hover:text-white" asChild>
                <Link href="/datasets">View marketplace</Link>
              </Button>
            </div>
          </div>

          <div className="glass-panel p-6 space-y-4">
            <p className="section-label">Multi-dataset agent preview</p>
            <div className="space-y-2">
              {["Global E-Commerce", "DeFi Graph", "Healthcare Triage"].map(
                (name) => (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-xl bg-white/[0.05] border border-white/10 px-4 py-3"
                  >
                    <span className="text-white/80">{name}</span>
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                      attached
                    </span>
                  </div>
                )
              )}
            </div>
            <div className="rounded-xl bg-white/[0.05] border border-white/10 p-4">
              <p className="text-xs uppercase tracking-wider text-white/40 mb-2">
                Cost estimate
              </p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">2,000 rows</span>
                <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                  0.004 SOL
                </span>
              </div>
              <p className="mt-2 text-xs text-white/40">
                Pricing combines row count, selected columns, and provider-set
                multipliers.
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
