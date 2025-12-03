import { Activity, CheckCircle2, Database, Globe, Server, Wifi } from "lucide-react";

const services = [
  { name: "API Gateway", status: "operational", icon: Globe },
  { name: "Data Streaming", status: "operational", icon: Wifi },
  { name: "Wallet RPC", status: "operational", icon: Server },
  { name: "Schema Mirror", status: "operational", icon: Database },
];

export default function StatusPage() {
  return (
    <div className="space-y-12 py-8">
      {/* Hero Section */}
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5">
          <Activity className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">All Systems Operational</span>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
          Platform status
        </h1>
        <p className="max-w-2xl text-lg text-white/60">
          Uptime, wallet RPC health, and dataset streaming status.
          Real-time monitoring for all Quarry AI services.
        </p>
      </div>

      <div className="glass-panel p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="section-label">Service health</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Current status
            </h2>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-emerald-400">Live</span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {services.map((service) => (
            <div
              key={service.name}
              className="glass-card p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05]">
                  <service.icon className="h-5 w-5 text-white/60" />
                </div>
                <span className="font-medium text-white">{service.name}</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm capitalize">{service.status}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
          <p className="text-sm text-white/50 text-center">
            Last updated: {new Date().toLocaleString()} • 99.99% uptime last 30 days
          </p>
        </div>
      </div>
    </div>
  );
}
