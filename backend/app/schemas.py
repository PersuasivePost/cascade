from pydantic import BaseModel


class Service(BaseModel):
    id: str
    name: str
    category: str
    vendor: str
    status: str


class Team(BaseModel):
    id: str
    name: str


class Workflow(BaseModel):
    id: str
    name: str
    platform: str
    status: str
    criticality: str
    description: str = ""


class WorkflowDetail(Workflow):
    owning_team: str | None = None
    depends_on: list[str] = []
    triggers: list[str] = []
    triggered_by: list[str] = []
    consumes: list[str] = []
    produces: list[str] = []


class AffectedWorkflow(BaseModel):
    workflow_id: str
    workflow_name: str
    criticality: str
    hops_from_failure: int
    teams: list[str]


class CascadeChain(BaseModel):
    chain: list[str]
    chain_length: int


class BlastRadiusResponse(BaseModel):
    service_id: str
    service_name: str
    affected_workflows: list[AffectedWorkflow]
    affected_team_count: int
    longest_chain: CascadeChain | None
    ai_summary: str
