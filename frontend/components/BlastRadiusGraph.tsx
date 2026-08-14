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

export default function BlastRadiusGraph({
  serviceName,
  affected,
}: {
  serviceName: string;
  affected: AffectedWorkflow[];
}) {
  const { nodes, edges } = useMemo(() => buildGraph(serviceName, affected), [serviceName, affected]);

  return (
    <div className="h-[440px] rounded-lg border border-line bg-surface overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
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
      data: { label: serviceName },
      sourcePosition: Position.Right,
      style: {
        background: "#EF4444",
        color: "#0B0F14",
        fontWeight: 700,
        fontFamily: "var(--font-display)",
        border: "3px solid #FCA5A5",
        borderRadius: 999,
        padding: "10px 18px",
        boxShadow: "0 0 0 8px rgba(239,68,68,0.12)",
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
  const RING_SPACING = 190;

  for (const hop of hops) {
    const ring = byHop.get(hop)!;
    const radius = (hop + 1) * RING_SPACING;
    const count = ring.length;
    ring.forEach((wf, i) => {
      // Spread nodes across a ~260deg arc so labels don't overlap the epicenter's left side
      const angle = (-130 + (i * 260) / Math.max(count - 1, 1)) * (Math.PI / 180);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const color = CRIT_COLOR[wf.criticality] || CRIT_COLOR.low;

      nodes.push({
        id: wf.workflow_id,
        position: { x, y },
        data: { label: wf.workflow_name },
        style: {
          background: "#1A222D",
          color: "#E7EDF3",
          border: `2px solid ${color}`,
          borderRadius: 10,
          padding: "8px 12px",
          fontSize: 12,
          fontFamily: "var(--font-body)",
          width: 168,
          textAlign: "center",
        },
      });

      edges.push({
        id: `e-${wf.workflow_id}`,
        source: hop === 0 ? "epicenter" : "epicenter",
        target: wf.workflow_id,
        type: "straight",
        style: { stroke: color, strokeOpacity: hop === 0 ? 0.7 : 0.25, strokeDasharray: hop === 0 ? undefined : "3 4" },
        animated: hop === 0,
      });
    });
  }

  return { nodes, edges };
}
