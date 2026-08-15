"""
Every Cypher statement the app runs, kept in one place so they're easy to
read and audit. All parameters are passed via the driver's parameter map —
never string-concatenated into the query text.
"""
from app.db import run_query

MAX_CASCADE_HOPS = 6


def list_services() -> list[dict]:
    cypher = """
    MATCH (s:Service)
    OPTIONAL MATCH (w:Workflow)-[:DEPENDS_ON]->(s)
    RETURN s.id AS id, s.name AS name, s.category AS category,
           s.vendor AS vendor, s.status AS status,
           count(DISTINCT w) AS directDependents
    ORDER BY directDependents DESC, s.name
    """
    return run_query(cypher)


def get_critical_dependencies() -> list[dict]:
    """
    Single Point of Failure (SPOF) Detection query:
    Evaluates every external service by counting its total downstream transitive
    impact across the entire workflow graph (0..6 hops), identifying services
    with high blast radii that pose systemic risk.
    """
    cypher = """
    MATCH (s:Service)
    OPTIONAL MATCH (origin:Workflow)-[:DEPENDS_ON]->(s)
    OPTIONAL MATCH path = (origin)-[:TRIGGERS*0..6]->(downstream:Workflow)
    OPTIONAL MATCH (t:Team)-[:OWNS]->(downstream)
    WITH s,
         count(DISTINCT origin) AS directWorkflows,
         count(DISTINCT downstream) AS totalImpactedWorkflows,
         count(DISTINCT t) AS impactedTeamCount,
         collect(DISTINCT downstream.criticality) AS criticalities,
         collect(DISTINCT downstream.name)[..5] AS sampleWorkflows
    RETURN s.id AS id,
           s.name AS name,
           s.category AS category,
           s.vendor AS vendor,
           s.status AS status,
           directWorkflows,
           totalImpactedWorkflows,
           impactedTeamCount,
           ("critical" IN criticalities) AS hasCriticalWorkflows,
           [w IN sampleWorkflows WHERE w IS NOT NULL] AS sampleWorkflows
    ORDER BY totalImpactedWorkflows DESC, directWorkflows DESC, s.name
    """
    return run_query(cypher)


def list_workflows() -> list[dict]:
    cypher = """
    MATCH (w:Workflow)
    OPTIONAL MATCH (t:Team)-[:OWNS]->(w)
    RETURN w.id AS id, w.name AS name, w.platform AS platform,
           w.status AS status, w.criticality AS criticality,
           w.description AS description, t.name AS owningTeam
    ORDER BY w.name
    """
    return run_query(cypher)


def get_workflow_detail(workflow_id: str) -> dict | None:
    cypher = """
    MATCH (w:Workflow {id: $workflowId})
    OPTIONAL MATCH (t:Team)-[:OWNS]->(w)
    OPTIONAL MATCH (w)-[:DEPENDS_ON]->(dep:Service)
    OPTIONAL MATCH (w)-[:TRIGGERS]->(next:Workflow)
    OPTIONAL MATCH (prev:Workflow)-[:TRIGGERS]->(w)
    OPTIONAL MATCH (w)-[:CONSUMES]->(cIn:DataObject)
    OPTIONAL MATCH (w)-[:PRODUCES]->(pOut:DataObject)
    RETURN w.id AS id, w.name AS name, w.platform AS platform,
           w.status AS status, w.criticality AS criticality,
           w.description AS description, t.name AS owningTeam,
           collect(DISTINCT dep.name) AS dependsOn,
           collect(DISTINCT next.name) AS triggers,
           collect(DISTINCT prev.name) AS triggeredBy,
           collect(DISTINCT cIn.name) AS consumes,
           collect(DISTINCT pOut.name) AS produces
    """
    rows = run_query(cypher, {"workflowId": workflow_id})
    return rows[0] if rows else None


def blast_radius(service_id: str) -> dict:
    """
    Multi-hop traversal (requirement 5.1): starting from every workflow that
    directly depends on the failing service, walk the TRIGGERS chain
    outward (0..N hops) to find every workflow that eventually fails as a
    result, tagging each with its minimum hop-distance, parent trigger ID, and
    owning teams.
    """
    cypher = """
    MATCH (s:Service {id: $serviceId})
    MATCH (origin:Workflow)-[:DEPENDS_ON]->(s)
    MATCH path = (origin)-[:TRIGGERS*0..%d]->(downstream:Workflow)
    WITH s, downstream, path, length(path) AS hopsFromFailure
    ORDER BY hopsFromFailure ASC
    WITH s, downstream, head(collect(path)) AS shortestPath, min(hopsFromFailure) AS hopsFromFailure
    OPTIONAL MATCH (team:Team)-[:OWNS]->(downstream)
    WITH s, downstream, hopsFromFailure, team,
         CASE WHEN hopsFromFailure = 0 THEN "epicenter" ELSE nodes(shortestPath)[-2].id END AS parentId
    RETURN s.name AS serviceName,
           downstream.id AS workflowId,
           downstream.name AS workflowName,
           downstream.criticality AS criticality,
           hopsFromFailure,
           parentId,
           [t IN collect(DISTINCT team.name) WHERE t IS NOT NULL] AS teams
    ORDER BY hopsFromFailure ASC, criticality DESC
    """ % MAX_CASCADE_HOPS
    return run_query(cypher, {"serviceId": service_id})


def longest_cascade_chain(service_id: str) -> dict | None:
    """
    The 'a relational database would find this awkward' query (5.1):
    the single longest unbroken chain of triggered workflows set off by one
    service outage, found via variable-length path matching.
    """
    cypher = """
    MATCH (s:Service {id: $serviceId})
    MATCH (origin:Workflow)-[:DEPENDS_ON]->(s)
    MATCH path = (origin)-[:TRIGGERS*0..%d]->(terminal:Workflow)
    WITH path, length(path) AS chainLength
    ORDER BY chainLength DESC
    LIMIT 1
    RETURN [n IN nodes(path) | n.name] AS chain, chainLength
    """ % MAX_CASCADE_HOPS
    rows = run_query(cypher, {"serviceId": service_id})
    return rows[0] if rows else None



def search_workflows(term: str) -> list[dict]:
    cypher = """
    MATCH (w:Workflow)
    WHERE toLower(w.name) CONTAINS toLower($term)
       OR toLower(w.description) CONTAINS toLower($term)
    OPTIONAL MATCH (t:Team)-[:OWNS]->(w)
    RETURN w.id AS id, w.name AS name, w.criticality AS criticality,
           t.name AS owningTeam
    ORDER BY w.name
    LIMIT 25
    """
    return run_query(cypher, {"term": term})


def graph_overview() -> dict:
    """Node/edge counts for the empty-state / dashboard header."""
    cypher = """
    MATCH (n)
    WITH labels(n)[0] AS label, count(n) AS n
    RETURN collect({label: label, count: n}) AS nodeCounts
    """
    rows = run_query(cypher)
    return rows[0] if rows else {"nodeCounts": []}
