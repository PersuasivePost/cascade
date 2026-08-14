"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Service, HealthStatus } from "@/lib/api";
import { Loading, EmptyState, ErrorState } from "@/components/Primitives";

export default function DashboardPage() {
  const [services, setServices] = useState<Service[] | null>(null);
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
  }, []);

  return (
    <div className="pt-12">
      <div className="mb-10">
        <p className="font-mono text-xs text-signal tracking-widest uppercase mb-3">Service inventory</p>
        <h1 className="font-display font-bold text-4xl text-ink mb-3 max-w-xl">
          See what breaks before it breaks.
        </h1>
        <p className="text-muted max-w-lg">
          Every external service your automations depend on. Pick one and simulate an outage to trace the
          full blast radius through chained workflows.
        </p>
      </div>

      {health && !health.database_connected && (
        <div className="mb-8 border border-warn/30 bg-warn/5 rounded-lg px-4 py-3 text-sm">
          <span className="font-mono text-warn">Database not connected.</span>{" "}
          <span className="text-muted">{health.error}</span>
        </div>
      )}

      {error && <ErrorState message={error} />}
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
                  {s.directDependents} dependent{s.directDependents !== 1 ? "s" : ""}
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
