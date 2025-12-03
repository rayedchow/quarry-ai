import { CheckCircle2, CloudUpload, FileCode2, Shield, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const steps = [
  {
    title: "Create schema mirror",
    description:
      "Point Quarry Connect at your warehouse. We ingest structure only—no data—then hydrate semantic labels.",
    icon: FileCode2,
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    title: "Review AI semantics",
    description:
      "Approve or edit the generated column descriptions before they go live in the marketplace.",
    icon: CheckCircle2,
    gradient: "from-blue-500 to-violet-500",
  },
  {
    title: "Publish + monetize",
    description:
      "Set price per row/column, payout wallet, and custom trust requirements for downstream agents.",
    icon: CloudUpload,
    gradient: "from-violet-500 to-fuchsia-500",
  },
];

export default function ProvidersPage() {
  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-1.5">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-xs font-medium text-cyan-400">Provider Hub</span>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
          Upload datasets without
          <br />
          <span className="text-gradient-accent">surrendering raw data.</span>
        </h1>
        <p className="max-w-2xl text-lg text-white/60">
          Quarry mirrors your schema, applies AI-generated semantics, and keeps
          every slice verifiable. You stay in control of privacy budgets and
          wallet payouts.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Upload Workflow */}
        <div className="glass-panel p-8 space-y-8">
          <div>
            <p className="section-label">How it works</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Upload workflow
            </h2>
          </div>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="group glass-card p-5 flex gap-5"
              >
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${step.gradient} shadow-lg`}>
                  <step.icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-medium text-white/60">
                      {index + 1}
                    </span>
                    <p className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors">
                      {step.title}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-white/50 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-white/50">
            <p className="flex items-center gap-2">
              <span className="text-cyan-400">Need help?</span>
              Email providers@quarry.ai for a white-glove schema onboarding session.
            </p>
          </div>
        </div>

        {/* Publish Form */}
        <div className="glass-panel p-8 space-y-8">
          <div>
            <p className="section-label">Get started</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Publish a dataset
            </h2>
          </div>

          <form className="space-y-4">
            <input
              className="input-field"
              placeholder="Dataset name"
            />
            <input
              className="input-field"
              placeholder="Publisher name"
            />
            <textarea
              className="input-field min-h-[120px] resize-none"
              placeholder="Describe what the dataset contains…"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <input
                className="input-field"
                placeholder="Price per row (SOL)"
              />
              <input
                className="input-field"
                placeholder="Price per column (SOL)"
              />
            </div>
            <Button className="btn-primary w-full h-12">
              <CloudUpload className="h-4 w-4" />
              Submit for review
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </form>

          <div className="glass-card p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-lg font-semibold text-white">
                  Trust controls
                </p>
                <p className="mt-1 text-sm text-white/50">
                  Opt into k-anonymity, DP noise, or pre-slice audits per dataset.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2 pl-16 text-sm text-white/40">
              <p className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-cyan-400" />
                Wallet-gated buyers only
              </p>
              <p className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-cyan-400" />
                Automatic contract + payout ledger
              </p>
              <p className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-cyan-400" />
                Real-time revocation + watermarking
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
