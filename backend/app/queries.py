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
    result, tagging each with its minimum hop-distance from the outage and
    every team that owns an affected workflow.
    """
    cypher = """
    MATCH (s:Service {id: $serviceId})
    MATCH (origin:Workflow)-[:DEPENDS_ON]->(s)
    MATCH path = (origin)-[:TRIGGERS*0..%d]->(downstream:Workflow)
    WITH s, downstream, min(length(path)) AS hopsFromFailure
    MATCH (team:Team)-[:OWNS]->(downstream)
    RETURN s.name AS serviceName,
           downstream.id AS workflowId,
           downstream.name AS workflowName,
           downstream.criticality AS criticality,
           hopsFromFailure,
           collect(DISTINCT team.name) AS teams
    ORDER BY hopsFromFailure ASC, criticality DESC
    """ % MAX_CASCADE_HOPS
    return run_query(cypher, {"serviceId": service_id})


def longest_cascade_chain(service_id: str) -> dict | None:
    """
    The 'a relational database would find this awkward' query (5.1):
    the single longest unbroken chain of triggered workflows set off by one
    service outage, found via variable-length path matching terminating at
    workflows with no further TRIGGERS edges. In SQL this needs a recursive
    CTE with manual cycle protection and re-joins at every depth; here it's
    one path pattern.
    """
    cypher = """
    MATCH (s:Service {id: $serviceId})
    MATCH (origin:Workflow)-[:DEPENDS_ON]->(s)
    MATCH path = (origin)-[:TRIGGERS*0..%d]->(terminal:Workflow)
    WHERE NOT (terminal)-[:TRIGGERS]->()
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
