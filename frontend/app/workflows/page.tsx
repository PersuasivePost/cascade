"use client";

import { useEffect, useMemo, useState } from "react";
import { api, WorkflowSummary } from "@/lib/api";
import { Loading, EmptyState, ErrorState, CriticalityPill } from "@/components/Primitives";

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

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
      (w) => w.name.toLowerCase().includes(q) || (w.owningTeam ?? "").toLowerCase().includes(q)
    );
  }, [workflows, query]);

  return (
    <div className="pt-12">
      <p className="font-mono text-xs text-signal tracking-widest uppercase mb-3">Workflow explorer</p>
      <h1 className="font-display font-bold text-3xl text-ink mb-6">Every automation, by owner</h1>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by workflow name or team..."
        className="w-full mb-6 bg-surface border border-line rounded-lg px-4 py-3 text-sm text-ink placeholder:text-muted focus:border-signal outline-none"
      />

      {error && <ErrorState message={error} />}
      {!error && workflows === null && <Loading label="Loading workflows" />}
      {!error && workflows !== null && filtered.length === 0 && (
        <EmptyState title="No matching workflows" hint="Try a different search term." />
      )}

      {filtered.length > 0 && (
        <div className="border border-line rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface2 text-muted font-mono text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Workflow</th>
                <th className="text-left px-4 py-2.5 font-medium">Platform</th>
                <th className="text-left px-4 py-2.5 font-medium">Team</th>
                <th className="text-left px-4 py-2.5 font-medium">Criticality</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => (
                <tr key={w.id} className="border-t border-line hover:bg-surface2/50">
                  <td className="px-4 py-3">
                    <p className="text-ink">{w.name}</p>
                    <p className="text-muted text-xs mt-0.5">{w.description}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-muted">{w.platform}</td>
                  <td className="px-4 py-3 text-muted">{w.owningTeam ?? "—"}</td>
                  <td className="px-4 py-3">
                    <CriticalityPill level={w.criticality} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
