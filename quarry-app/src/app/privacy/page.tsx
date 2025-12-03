import { Shield, Lock, Eye, Server } from "lucide-react";

const principles = [
  {
    title: "Schema-only access",
    description: "Raw data never leaves provider infrastructure. Only metadata and AI-generated semantics are exposed.",
    icon: Eye,
  },
  {
    title: "Cryptographic verification",
    description: "Every slice is signed and watermarked with immutable audit trails for compliance.",
    icon: Lock,
  },
  {
    title: "Provider control",
    description: "Data owners maintain full control over privacy budgets, access policies, and revocation rights.",
    icon: Server,
  },
];

export default function PrivacyPage() {
  return (
    <div className="space-y-12 py-8">
      {/* Hero Section */}
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5">
          <Shield className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">Privacy First</span>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
          Privacy Center
        </h1>
        <p className="max-w-2xl text-lg text-white/60">
          Quarry AI keeps raw data inside provider infrastructure. Only schema
          metadata, AI-generated semantics, and signed delivery manifests exit the
          vault.
        </p>
      </div>

      <div className="glass-panel p-8 space-y-8">
        <div>
          <p className="section-label">Our commitment</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Privacy principles
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {principles.map((principle) => (
            <div
              key={principle.title}
              className="glass-card p-6 space-y-4"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-white/10">
                <principle.icon className="h-5 w-5 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">{principle.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{principle.description}</p>
            </div>
          ))}
        </div>

        <div className="divider" />

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
          <p className="text-sm text-white/50 text-center">
            Full privacy policy documentation coming soon. Contact privacy@quarry.ai for inquiries.
          </p>
        </div>
      </div>
    </div>
  );
}
