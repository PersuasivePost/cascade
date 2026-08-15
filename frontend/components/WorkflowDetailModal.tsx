"use client";

import { useEffect, useState } from "react";
import { api, WorkflowDetail } from "@/lib/api";
import { CriticalityPill, Loading } from "./Primitives";

interface WorkflowDetailModalProps {
  workflowId: string | null;
  onClose: () => void;
}

export default function WorkflowDetailModal({ workflowId, onClose }: WorkflowDetailModalProps) {
  const [detail, setDetail] = useState<WorkflowDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workflowId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setError(null);
    api
      .workflow(workflowId)
      .then(setDetail)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [workflowId]);

  if (!workflowId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-surface border border-line rounded-xl p-6 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-ink font-mono text-xs px-2.5 py-1 rounded bg-surface2 border border-line transition-colors"
        >
          ✕ esc
        </button>

        {loading && <Loading label="Fetching workflow details" />}

        {error && (
          <div className="py-8 text-center font-mono text-sm text-crit">
            Failed to load workflow: {error}
          </div>
        )}

        {detail && (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <CriticalityPill level={detail.criticality} />
              <span className="font-mono text-xs text-muted uppercase tracking-wider">{detail.platform}</span>
              {detail.owningTeam && (
                <span className="font-mono text-xs text-signal bg-signal/10 px-2.5 py-0.5 rounded border border-signal/30">
                  {detail.owningTeam} Team
                </span>
              )}
            </div>

            <h2 className="font-display font-bold text-2xl text-ink mb-2">{detail.name}</h2>
            <p className="text-sm text-muted mb-6 leading-relaxed bg-surface2/50 p-3.5 rounded-lg border border-line/50">
              {detail.description || "No description provided."}
            </p>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="border border-line rounded-lg p-3 bg-surface2/30">
                <span className="text-muted uppercase block mb-1.5 font-semibold">Depends On Services</span>
                {detail.dependsOn && detail.dependsOn.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {detail.dependsOn.map((dep, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-surface border border-line text-ink">
                        {dep}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted italic">None</span>
                )}
              </div>

              <div className="border border-line rounded-lg p-3 bg-surface2/30">
                <span className="text-muted uppercase block mb-1.5 font-semibold">Triggers Next</span>
                {detail.triggers && detail.triggers.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {detail.triggers.map((trig, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-signal/10 border border-signal/30 text-signal">
                        → {trig}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted italic">Terminal node</span>
                )}
              </div>

              <div className="border border-line rounded-lg p-3 bg-surface2/30">
                <span className="text-muted uppercase block mb-1.5 font-semibold">Consumes Data</span>
                {detail.consumes && detail.consumes.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {detail.consumes.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-warn/10 border border-warn/30 text-warn">
                        {c}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted italic">None</span>
                )}
              </div>

              <div className="border border-line rounded-lg p-3 bg-surface2/30">
                <span className="text-muted uppercase block mb-1.5 font-semibold">Produces Data</span>
                {detail.produces && detail.produces.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {detail.produces.map((p, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-ok/10 border border-ok/30 text-ok">
                        {p}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted italic">None</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
