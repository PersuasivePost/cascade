"use client";

import { useMemo } from "react";
import ReactFlow, { Background, BackgroundVariant, Node, Edge, Position } from "reactflow";
import "reactflow/dist/style.css";
import { AffectedWorkflow } from "@/lib/api";

const CRIT_COLOR: Record<string, string> = {
  critical: "#EF4444",
  high: "#F5A623",
  medium: "#5EA8FF",
  low: "#8A96A3",
};

interface BlastRadiusGraphProps {
  serviceName: string;
  affected: AffectedWorkflow[];
  onSelectWorkflow?: (workflowId: string) => void;
}

export default function BlastRadiusGraph({
  serviceName,
  affected,
  onSelectWorkflow,
}: BlastRadiusGraphProps) {
  const { nodes, edges } = useMemo(() => buildGraph(serviceName, affected), [serviceName, affected]);

  return (
    <div className="h-[480px] rounded-xl border border-line bg-surface overflow-hidden relative shadow-inner">
      <div className="absolute top-3 right-3 z-10 font-mono text-[10px] text-muted bg-surface2/80 px-2.5 py-1 rounded border border-line backdrop-blur-sm">
        Click any workflow node to view details
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        onNodeClick={(_, node) => {
          if (node.id !== "epicenter" && onSelectWorkflow) {
            onSelectWorkflow(node.id);
          }
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} color="#232D39" gap={22} size={1} />
      </ReactFlow>
    </div>
  );
}

function buildGraph(serviceName: string, affected: AffectedWorkflow[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [
    {
      id: "epicenter",
      position: { x: 0, y: 0 },
      data: { label: `💥 ${serviceName}` },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: {
        background: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
        color: "#FFFFFF",
        fontWeight: 700,
        fontFamily: "var(--font-display)",
        border: "3px solid #FCA5A5",
        borderRadius: 999,
        padding: "12px 22px",
        fontSize: 14,
        boxShadow: "0 0 25px rgba(239, 68, 68, 0.4)",
        cursor: "default",
      },
    },
  ];
  const edges: Edge[] = [];

  const byHop = new Map<number, AffectedWorkflow[]>();
  for (const wf of affected) {
    const list = byHop.get(wf.hops_from_failure) ?? [];
    list.push(wf);
    byHop.set(wf.hops_from_failure, list);
  }

  const hops = Array.from(byHop.keys()).sort((a, b) => a - b);
  const RING_SPACING = 210;

  for (const hop of hops) {
    const ring = byHop.get(hop)!;
    const radius = (hop + 1) * RING_SPACING;
    const count = ring.length;

    ring.forEach((wf, i) => {
      // Spread nodes across an arc
      const angle = (-130 + (i * 260) / Math.max(count - 1, 1)) * (Math.PI / 180);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const color = CRIT_COLOR[wf.criticality] || CRIT_COLOR.low;

      nodes.push({
        id: wf.workflow_id,
        position: { x, y },
        data: {
          label: `${wf.workflow_name}`,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        style: {
          background: "#161D27",
          color: "#E7EDF3",
          border: `2px solid ${color}`,
          borderRadius: 10,
          padding: "10px 14px",
          fontSize: 12,
          fontWeight: 500,
          fontFamily: "var(--font-body)",
          width: 175,
          textAlign: "center",
          boxShadow: `0 4px 14px rgba(0, 0, 0, 0.3), 0 0 10px ${color}22`,
          cursor: "pointer",
        },
      });

      const sourceId = wf.parent_id && wf.parent_id !== "epicenter" ? wf.parent_id : "epicenter";

      edges.push({
        id: `e-${sourceId}-${wf.workflow_id}`,
        source: sourceId,
        target: wf.workflow_id,
        type: "smoothstep",
        style: {
          stroke: color,
          strokeWidth: hop === 0 ? 2.5 : 1.8,
          strokeOpacity: hop === 0 ? 0.85 : 0.6,
          strokeDasharray: hop === 0 ? undefined : "4 4",
        },
        animated: true,
      });
    });
  }

  return { nodes, edges };
}
