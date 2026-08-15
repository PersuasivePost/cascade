"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Service, CriticalDependency, HealthStatus } from "@/lib/api";
import { Loading, EmptyState, ErrorState } from "@/components/Primitives";

export default function DashboardPage() {
  const [services, setServices] = useState<Service[] | null>(null);
  const [spof, setSpof] = useState<CriticalDependency[] | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .health()
      .then(setHealth)
      .catch(() => setHealth({ database_connected: false, error: "Could not reach the API." }));

    api
      .services()
      .then(setServices)
      .catch((e) => setError(e.message));

    api
      .spof()
      .then(setSpof)
      .catch(() => {}); // Optional highlight widget
  }, []);

  return (
    <div className="pt-12">
      <div className="mb-10">
        <p className="font-mono text-xs text-signal tracking-widest uppercase mb-3">Automation Blast-Radius Engine</p>
        <h1 className="font-display font-bold text-4xl text-ink mb-3 max-w-xl">
          See what breaks before it breaks.
        </h1>
        <p className="text-muted max-w-xl">
          Models third-party services, workflows, and multi-hop triggers as a graph in CognoDB. Simulate an outage or discover systemic single points of failure.
        </p>
      </div>

      {health && !health.database_connected && (
        <div className="mb-8 border border-warn/30 bg-warn/5 rounded-lg px-4 py-3 text-sm">
          <span className="font-mono text-warn">Database not connected.</span>{" "}
          <span className="text-muted">{health.error}</span>
        </div>
      )}

      {error && <ErrorState message={error} />}

      {/* Critical Dependencies / SPOF Banner Section */}
      {spof && spof.length > 0 && (
        <div className="mb-12 border border-crit/40 bg-surface rounded-xl p-6 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-crit animate-ping" />
                <h2 className="font-display font-bold text-xl text-ink">Critical Dependencies (SPOF Analysis)</h2>
              </div>
              <p className="text-xs text-muted">
                Services sorted by total transitive downstream workflow blast radius.
              </p>
            </div>
            <Link
              href="/dependencies"
              className="text-xs font-mono text-signal hover:underline flex items-center gap-1"
            >
              View Full SPOF Report →
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {spof.slice(0, 4).map((item) => (
              <Link
                key={item.id}
                href={`/blast-radius/${item.id}`}
                className="group border border-line rounded-lg p-4 bg-surface2/60 hover:border-crit/60 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display font-semibold text-ink text-base group-hover:text-crit transition-colors">
                    {item.name}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                    item.riskLevel === "HIGH" ? "bg-crit/20 text-crit border border-crit/40" : "bg-warn/20 text-warn border border-warn/40"
                  }`}>
                    {item.riskLevel}
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs font-mono text-muted mt-3 pt-2 border-t border-line/40">
                  <span>Downstream:</span>
                  <span className="font-bold text-ink text-sm">{item.totalImpactedWorkflows} workflows</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Full Services Inventory Section */}
      <div className="mb-6">
        <h2 className="font-display font-bold text-2xl text-ink mb-1">Service Inventory</h2>
        <p className="text-xs text-muted">Pick any external service to launch an interactive blast-radius outage simulation.</p>
      </div>

      {!error && services === null && <Loading label="Loading services" />}
      {!error && services !== null && services.length === 0 && (
        <EmptyState
          title="No services yet"
          hint="Run backend/seed/seed_data.py against your CognoDB instance to load the demo automation stack."
        />
      )}

      {services && services.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => (
            <Link
              key={s.id}
              href={`/blast-radius/${s.id}`}
              className="group border border-line rounded-lg p-5 bg-surface hover:border-crit/40 hover:bg-surface2 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <span className="w-2 h-2 rounded-full bg-ok mt-1.5" />
                <span className="font-mono text-[11px] text-muted">{s.category}</span>
              </div>
              <p className="font-display font-medium text-ink text-lg mb-1">{s.name}</p>
              <p className="text-muted text-xs mb-4">{s.vendor}</p>
              <div className="flex items-center justify-between pt-3 border-t border-line">
                <span className="font-mono text-xs text-muted">
                  {s.directDependents} direct dependent{s.directDependents !== 1 ? "s" : ""}
                </span>
                <span className="text-xs font-mono text-crit opacity-0 group-hover:opacity-100 transition-opacity">
                  simulate outage →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
