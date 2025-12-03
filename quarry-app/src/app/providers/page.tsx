import { CheckCircle2, CloudUpload, FileCode2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const steps = [
  {
    title: "Create schema mirror",
    description:
      "Point Quarry Connect at your warehouse. We ingest structure only—no data—then hydrate semantic labels.",
    icon: FileCode2,
  },
  {
    title: "Review AI semantics",
    description:
      "Approve or edit the generated column descriptions before they go live in the marketplace.",
    icon: CheckCircle2,
  },
  {
    title: "Publish + monetize",
    description:
      "Set price per row/column, payout wallet, and custom trust requirements for downstream agents.",
    icon: CloudUpload,
  },
];

export default function ProvidersPage() {
  return (
    <div className="container space-y-12 py-16">
      <div className="space-y-4">
        <Badge variant="outline">Provider hub</Badge>
        <h1 className="text-4xl font-semibold text-white">
          Upload datasets without surrendering raw data.
        </h1>
        <p className="text-lg text-muted-foreground">
          Quarry mirrors your schema, applies AI-generated semantics, and keeps
          every slice verifiable. You stay in control of privacy budgets and
          wallet payouts.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6 rounded-3xl border border-white/10 bg-black/40 p-8">
          <h2 className="text-2xl font-semibold text-white">
            Upload workflow
          </h2>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-primary">
                  <step.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-white/50">
                    Step {index + 1}
                  </p>
                  <p className="text-lg font-semibold text-white">
                    {step.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-dashed border-white/20 p-6 text-sm text-muted-foreground">
            Need help? Email providers@quarry.ai for a white-glove schema
            onboarding session.
          </div>
        </div>

        <div className="space-y-6 rounded-3xl border border-white/10 bg-white/[0.02] p-8">
          <h2 className="text-2xl font-semibold text-white">
            Publish a dataset
          </h2>
          <form className="space-y-4">
            <input
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none ring-primary/40 placeholder:text-white/40 focus:ring"
              placeholder="Dataset name"
            />
            <input
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none ring-primary/40 placeholder:text-white/40 focus:ring"
              placeholder="Publisher name"
            />
            <textarea
              className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none ring-primary/40 placeholder:text-white/40 focus:ring"
              placeholder="Describe what the dataset contains…"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <input
                className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none ring-primary/40 placeholder:text-white/40 focus:ring"
                placeholder="Price per row (SOL)"
              />
              <input
                className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none ring-primary/40 placeholder:text-white/40 focus:ring"
                placeholder="Price per column (SOL)"
              />
            </div>
            <Button className="w-full gap-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400">
              <CloudUpload className="h-4 w-4" />
              Submit for review
            </Button>
          </form>

          <div className="rounded-2xl border border-white/10 bg-black/40 p-5 text-sm text-white/80">
            <div className="flex items-center gap-3">
              <Shield className="h-10 w-10 text-primary" />
              <div>
                <p className="text-lg font-semibold text-white">
                  Trust controls
                </p>
                <p className="text-xs text-muted-foreground">
                  Opt into k-anonymity, DP noise, or pre-slice audits per
                  dataset.
                </p>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-muted-foreground">
              <li>• Wallet-gated buyers only</li>
              <li>• Automatic contract + payout ledger</li>
              <li>• Real-time revocation + watermarking</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

