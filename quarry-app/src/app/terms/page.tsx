import { FileText, Scale } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="space-y-12 py-8">
      {/* Hero Section */}
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5">
          <Scale className="h-3.5 w-3.5 text-white/60" />
          <span className="text-xs font-medium text-white/60">Legal</span>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
          Terms of Service
        </h1>
        <p className="max-w-2xl text-lg text-white/60">
          Last updated: December 2024
        </p>
      </div>

      <div className="glass-panel p-8 space-y-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-white/10">
            <FileText className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Terms Preview</h2>
            <p className="text-white/60 leading-relaxed">
              This placeholder will hold the full Quarry AI terms of service. Usage of
              schema-only previews and trustless delivery slices remains governed by
              your provider agreement until finalized.
            </p>
            <p className="text-white/50 leading-relaxed">
              By using Quarry AI services, you agree to comply with all applicable laws
              and regulations regarding data usage, privacy, and intellectual property rights.
              Our platform facilitates schema-only data exploration with cryptographic
              verification and audit trails.
            </p>
          </div>
        </div>

        <div className="divider" />

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
          <p className="text-sm text-white/50 text-center">
            Full terms documentation coming soon. Contact legal@quarry.ai for inquiries.
          </p>
        </div>
      </div>
    </div>
  );
}
