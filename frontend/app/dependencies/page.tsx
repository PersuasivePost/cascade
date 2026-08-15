"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, CriticalDependency } from "@/lib/api";
import { Loading, EmptyState, ErrorState } from "@/components/Primitives";

export default function DependenciesPage() {
  const [dependencies, setDependencies] = useState<CriticalDependency[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .spof()
      .then(setDependencies)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="pt-12">
      <div className="mb-10">
        <p className="font-mono text-xs text-signal tracking-widest uppercase mb-3">
          Single Points of Failure (SPOF)
        </p>
        <h1 className="font-display font-bold text-4xl text-ink mb-3 max-w-xl">
          Critical Dependencies Analysis
        </h1>
        <p className="text-muted max-w-2xl">
          Ranks external services by total transitive downstream blast radius. Services with high transitive impact pose systemic risk—a single failure in them cascades through multiple workflows and teams.
        </p>
      </div>

      {error && <ErrorState message={error} />}
      {!error && dependencies === null && <Loading label="Analyzing dependency graph" />}
      {!error && dependencies !== null && dependencies.length === 0 && (
        <EmptyState title="No dependency data" hint="Make sure CognoDB is seeded." />
      )}

      {dependencies && dependencies.length > 0 && (
        <div className="space-y-4">
          {dependencies.map((dep) => {
            const riskColor =
              dep.riskLevel === "HIGH"
                ? "border-crit/50 bg-crit/5 text-crit"
                : dep.riskLevel === "MEDIUM"
                ? "border-warn/50 bg-warn/5 text-warn"
                : "border-line bg-surface2 text-muted";

            return (
              <div
                key={dep.id}
                className="border border-line rounded-lg p-6 bg-surface hover:border-signal/40 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="font-display font-bold text-xl text-ink">{dep.name}</h2>
                      <span className={`px-2.5 py-0.5 rounded-full border text-xs font-mono font-semibold uppercase ${riskColor}`}>
                        {dep.riskLevel} RISK SPOF
                      </span>
                    </div>
                    <p className="text-xs text-muted font-mono">
                      {dep.category} • Vendor: {dep.vendor}
                    </p>
                  </div>

                  <Link
                    href={`/blast-radius/${dep.id}`}
                    className="px-3.5 py-2 rounded-lg bg-surface2 border border-line text-xs font-mono text-signal hover:border-signal hover:bg-signal/10 transition-all"
                  >
                    Simulate Outage →
                  </Link>
                </div>

                <div className="grid sm:grid-cols-3 gap-4 py-3 px-4 rounded-lg bg-surface2/50 border border-line/50 mb-4">
                  <div>
                    <span className="text-[11px] font-mono text-muted uppercase block">Total Transitive Impact</span>
                    <span className="font-display font-bold text-2xl text-ink">{dep.totalImpactedWorkflows}</span>
                    <span className="text-xs text-muted ml-1.5">workflows</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-mono text-muted uppercase block">Directly Dependent</span>
                    <span className="font-display font-bold text-2xl text-ink">{dep.directWorkflows}</span>
                    <span className="text-xs text-muted ml-1.5">workflows</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-mono text-muted uppercase block">Owning Teams Affected</span>
                    <span className="font-display font-bold text-2xl text-ink">{dep.impactedTeamCount}</span>
                    <span className="text-xs text-muted ml-1.5">teams</span>
                  </div>
                </div>

                {dep.sampleWorkflows && dep.sampleWorkflows.length > 0 && (
                  <div>
                    <p className="text-xs font-mono text-muted uppercase tracking-wider mb-2">
                      Cascading Workflow Chain Sample:
                    </p>
                    <div className="flex items-center flex-wrap gap-2 font-mono text-xs">
                      {dep.sampleWorkflows.map((wf, idx) => (
                        <span key={idx} className="flex items-center gap-2">
                          <span className="px-2 py-1 rounded bg-surface2 border border-line text-ink">
                            {wf}
                          </span>
                          {idx < dep.sampleWorkflows.length - 1 && (
                            <span className="text-signal">→</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
