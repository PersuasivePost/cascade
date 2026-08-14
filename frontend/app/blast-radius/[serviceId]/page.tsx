"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, BlastRadius } from "@/lib/api";
import { Loading, ErrorState, EmptyState, CriticalityPill } from "@/components/Primitives";
import BlastRadiusGraph from "@/components/BlastRadiusGraph";

export default function BlastRadiusPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const [data, setData] = useState<BlastRadius | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    api
      .blastRadius(serviceId)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [serviceId]);

  return (
    <div className="pt-10">
      <Link href="/" className="font-mono text-xs text-muted hover:text-ink transition-colors">
        ← all services
      </Link>

      {error && (
        <div className="mt-6">
          <ErrorState message={error} />
        </div>
      )}

      {!error && !data && (
        <div className="mt-6">
          <Loading label="Tracing blast radius" />
        </div>
      )}

      {data && (
        <div className="mt-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-crit pulse-ring" />
            <p className="font-mono text-xs text-crit uppercase tracking-widest">Simulated outage</p>
          </div>
          <h1 className="font-display font-bold text-3xl text-ink mb-6">{data.service_name} is down</h1>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <Stat label="Workflows affected" value={data.affected_workflows.length} />
            <Stat label="Teams affected" value={data.affected_team_count} />
            <Stat
              label="Deepest cascade"
              value={`${data.longest_chain?.chain_length ?? 0} hop${(data.longest_chain?.chain_length ?? 0) !== 1 ? "s" : ""}`}
            />
          </div>

          <div className="border border-line rounded-lg p-5 bg-surface mb-6">
            <p className="font-mono text-[11px] text-signal uppercase tracking-widest mb-2">Incident summary</p>
            <p className="text-ink text-sm leading-relaxed">{data.ai_summary}</p>
          </div>

          {data.affected_workflows.length === 0 ? (
            <EmptyState title="Nothing depends on this service" hint="An outage here has no downstream impact." />
          ) : (
            <>
              <p className="font-mono text-[11px] text-muted uppercase tracking-widest mb-3">
                Blast radius — rings represent hops from the failure
              </p>
              <BlastRadiusGraph serviceName={data.service_name} affected={data.affected_workflows} />

              {data.longest_chain && data.longest_chain.chain_length > 0 && (
                <div className="mt-6 border border-line rounded-lg p-5 bg-surface">
                  <p className="font-mono text-[11px] text-muted uppercase tracking-widest mb-3">
                    Longest unbroken cascade
                  </p>
                  <div className="flex items-center flex-wrap gap-2 font-mono text-sm">
                    {data.longest_chain.chain.map((name, i) => (
                      <span key={i} className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded bg-surface2 border border-line text-ink">{name}</span>
                        {i < data.longest_chain!.chain.length - 1 && <span className="text-crit">→</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 border border-line rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-surface2 text-muted font-mono text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium">Workflow</th>
                      <th className="text-left px-4 py-2.5 font-medium">Criticality</th>
                      <th className="text-left px-4 py-2.5 font-medium">Hops</th>
                      <th className="text-left px-4 py-2.5 font-medium">Teams</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.affected_workflows.map((wf) => (
                      <tr key={wf.workflow_id} className="border-t border-line">
                        <td className="px-4 py-2.5 text-ink">{wf.workflow_name}</td>
                        <td className="px-4 py-2.5">
                          <CriticalityPill level={wf.criticality} />
                        </td>
                        <td className="px-4 py-2.5 font-mono text-muted">{wf.hops_from_failure}</td>
                        <td className="px-4 py-2.5 text-muted">{wf.teams.join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-line rounded-lg p-4 bg-surface">
      <p className="font-mono text-[11px] text-muted uppercase tracking-widest mb-1">{label}</p>
      <p className="font-display font-bold text-2xl text-ink">{value}</p>
    </div>
  );
}
