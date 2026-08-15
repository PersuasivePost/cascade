const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  } catch {
    throw new ApiError(
      "Can't reach the Cascade API. Is the backend running and NEXT_PUBLIC_API_URL set correctly?",
      0
    );
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || body.error || detail;
    } catch {
      /* non-JSON error body, keep statusText */
    }
    throw new ApiError(detail, res.status);
  }
  return res.json();
}

export type Service = {
  id: string;
  name: string;
  category: string;
  vendor: string;
  status: string;
  directDependents: number;
};

export type WorkflowSummary = {
  id: string;
  name: string;
  platform: string;
  status: string;
  criticality: "critical" | "high" | "medium" | "low";
  description: string;
  owningTeam: string | null;
};

export type WorkflowDetail = WorkflowSummary & {
  dependsOn: string[];
  triggers: string[];
  triggeredBy: string[];
  consumes: string[];
  produces: string[];
};

export type AffectedWorkflow = {
  workflow_id: string;
  workflow_name: string;
  criticality: string;
  hops_from_failure: number;
  parent_id?: string;
  teams: string[];
};

export type BlastRadius = {
  service_id: string;
  service_name: string;
  affected_workflows: AffectedWorkflow[];
  affected_team_count: number;
  longest_chain: { chain: string[]; chain_length: number } | null;
  ai_summary: string;
};

export type HealthStatus = { database_connected: boolean; error: string | null };

export type CriticalDependency = {
  id: string;
  name: string;
  category: string;
  vendor: string;
  status: string;
  directWorkflows: number;
  totalImpactedWorkflows: number;
  impactedTeamCount: number;
  hasCriticalWorkflows: boolean;
  sampleWorkflows: string[];
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
};

export const api = {
  health: () => request<HealthStatus>("/health"),
  services: () => request<Service[]>("/services"),
  spof: () => request<CriticalDependency[]>("/services/spof"),
  workflows: () => request<WorkflowSummary[]>("/workflows"),
  workflow: (id: string) => request<WorkflowDetail>(`/workflows/${id}`),
  search: (q: string) => request<{ id: string; name: string; criticality: string; owningTeam: string | null }[]>(
    `/workflows/search?q=${encodeURIComponent(q)}`
  ),
  blastRadius: (serviceId: string) => request<BlastRadius>(`/blast-radius/${serviceId}`),
};

