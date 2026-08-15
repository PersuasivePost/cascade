"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, BlastRadius } from "@/lib/api";
import { Loading, ErrorState, EmptyState, CriticalityPill } from "@/components/Primitives";
import BlastRadiusGraph from "@/components/BlastRadiusGraph";
import WorkflowDetailModal from "@/components/WorkflowDetailModal";

export default function BlastRadiusPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const [data, setData] = useState<BlastRadius | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);

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
      <Link href="/" className="font-mono text-xs text-muted hover:text-ink transition-colors inline-flex items-center gap-1 mb-4">
        ← All Services
      </Link>

      <WorkflowDetailModal
        workflowId={selectedWorkflowId}
        onClose={() => setSelectedWorkflowId(null)}
      />

      {error && (
        <div className="mt-4">
          <ErrorState message={error} />
        </div>
      )}

      {!error && !data && (
        <div className="mt-8">
          <Loading label="Tracing multi-hop blast radius" />
        </div>
      )}

      {data && (
        <div className="mt-2">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-crit pulse-ring" />
            <p className="font-mono text-xs text-crit uppercase tracking-widest font-semibold">Simulated Outage Scenario</p>
          </div>
          <h1 className="font-display font-bold text-4xl text-ink mb-6">{data.service_name} is Down</h1>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <Stat label="Workflows Affected" value={data.affected_workflows.length} color="text-crit" />
            <Stat label="Teams Affected" value={data.affected_team_count} color="text-warn" />
            <Stat
              label="Deepest Cascade"
              value={`${data.longest_chain?.chain_length ?? 0} hop${(data.longest_chain?.chain_length ?? 0) !== 1 ? "s" : ""}`}
              color="text-signal"
            />
          </div>

          <div className="border border-line rounded-xl p-5 bg-surface2/40 mb-6 shadow-md backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs">🤖</span>
              <p className="font-mono text-[11px] text-signal uppercase tracking-widest font-bold">Incident Summary</p>
            </div>
            <p className="text-ink text-sm leading-relaxed">{data.ai_summary}</p>
          </div>

          {data.affected_workflows.length === 0 ? (
            <EmptyState title="Nothing depends on this service" hint="An outage here has no downstream impact across the automation stack." />
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="font-mono text-[11px] text-muted uppercase tracking-widest">
                  Blast radius visualization — directed cascade paths
                </p>
              </div>
              <BlastRadiusGraph
                serviceName={data.service_name}
                affected={data.affected_workflows}
                onSelectWorkflow={setSelectedWorkflowId}
              />

              {data.longest_chain && data.longest_chain.chain_length > 0 && (
                <div className="mt-6 border border-line rounded-xl p-5 bg-surface">
                  <p className="font-mono text-[11px] text-muted uppercase tracking-widest mb-3 font-semibold">
                    Single Longest Unbroken Cascade Chain
                  </p>
                  <div className="flex items-center flex-wrap gap-2 font-mono text-sm">
                    {data.longest_chain.chain.map((name, i) => (
                      <span key={i} className="flex items-center gap-2">
                        <span className="px-3 py-1.5 rounded-lg bg-surface2 border border-line text-ink font-medium shadow-sm">
                          {name}
                        </span>
                        {i < data.longest_chain!.chain.length - 1 && <span className="text-crit font-bold">→</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 border border-line rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-surface2 text-muted font-mono text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Affected Workflow</th>
                      <th className="text-left px-4 py-3 font-medium">Criticality</th>
                      <th className="text-left px-4 py-3 font-medium">Hops</th>
                      <th className="text-left px-4 py-3 font-medium">Teams</th>
                      <th className="text-right px-4 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.affected_workflows.map((wf) => (
                      <tr
                        key={wf.workflow_id}
                        onClick={() => setSelectedWorkflowId(wf.workflow_id)}
                        className="border-t border-line hover:bg-surface2/60 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-ink font-medium">{wf.workflow_name}</td>
                        <td className="px-4 py-3">
                          <CriticalityPill level={wf.criticality} />
                        </td>
                        <td className="px-4 py-3 font-mono text-muted">{wf.hops_from_failure}</td>
                        <td className="px-4 py-3 text-muted">{wf.teams.join(", ") || "Unassigned"}</td>
                        <td className="px-4 py-3 text-right text-xs font-mono text-signal">Inspect →</td>
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

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="border border-line rounded-xl p-5 bg-surface shadow-sm">
      <p className="font-mono text-[11px] text-muted uppercase tracking-widest mb-1">{label}</p>
      <p className={`font-display font-bold text-3xl ${color || "text-ink"}`}>{value}</p>
    </div>
  );
}
