"use client";

import { useEffect, useMemo, useState } from "react";
import { api, WorkflowSummary } from "@/lib/api";
import { Loading, EmptyState, ErrorState, CriticalityPill } from "@/components/Primitives";
import WorkflowDetailModal from "@/components/WorkflowDetailModal";

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);

  useEffect(() => {
    api
      .workflows()
      .then(setWorkflows)
      .catch((e) => setError(e.message));
  }, []);

  const filtered = useMemo(() => {
    if (!workflows) return [];
    const q = query.trim().toLowerCase();
    if (!q) return workflows;
    return workflows.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        (w.owningTeam ?? "").toLowerCase().includes(q) ||
        w.platform.toLowerCase().includes(q) ||
        w.criticality.toLowerCase().includes(q)
    );
  }, [workflows, query]);

  return (
    <div className="pt-12">
      <WorkflowDetailModal
        workflowId={selectedWorkflowId}
        onClose={() => setSelectedWorkflowId(null)}
      />

      <p className="font-mono text-xs text-signal tracking-widest uppercase mb-3">Workflow Explorer</p>
      <h1 className="font-display font-bold text-4xl text-ink mb-6">Every Automation, by Owner</h1>

      <div className="relative mb-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by workflow name, platform, team, or criticality..."
          className="w-full bg-surface border border-line rounded-xl px-4 py-3.5 text-sm text-ink placeholder:text-muted focus:border-signal outline-none transition-all shadow-sm"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-4 top-3.5 text-xs font-mono text-muted hover:text-ink"
          >
            Clear ✕
          </button>
        )}
      </div>

      {error && <ErrorState message={error} />}
      {!error && workflows === null && <Loading label="Loading workflow directory" />}
      {!error && workflows !== null && filtered.length === 0 && (
        <EmptyState title="No matching workflows" hint="Try a different search term." />
      )}

      {filtered.length > 0 && (
        <div className="border border-line rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-surface2 text-muted font-mono text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Workflow</th>
                <th className="text-left px-4 py-3 font-medium">Platform</th>
                <th className="text-left px-4 py-3 font-medium">Team</th>
                <th className="text-left px-4 py-3 font-medium">Criticality</th>
                <th className="text-right px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => (
                <tr
                  key={w.id}
                  onClick={() => setSelectedWorkflowId(w.id)}
                  className="border-t border-line hover:bg-surface2/60 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3.5">
                    <p className="text-ink font-medium">{w.name}</p>
                    <p className="text-muted text-xs mt-0.5 max-w-lg line-clamp-1">{w.description}</p>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-muted">{w.platform}</td>
                  <td className="px-4 py-3.5 text-muted">{w.owningTeam ?? "—"}</td>
                  <td className="px-4 py-3.5">
                    <CriticalityPill level={w.criticality} />
                  </td>
                  <td className="px-4 py-3.5 text-right text-xs font-mono text-signal">Inspect →</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
