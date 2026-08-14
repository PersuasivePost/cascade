from fastapi import APIRouter, HTTPException

from app import queries
from app.ai_summary import generate_incident_summary
from app.db import DatabaseUnavailable

router = APIRouter()


def _wrap(fn, *args, **kwargs):
    """Turn a DatabaseUnavailable into a clean 503 instead of a stack trace."""
    try:
        return fn(*args, **kwargs)
    except DatabaseUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e)) from e


@router.get("/services")
def get_services():
    return _wrap(queries.list_services)


@router.get("/workflows")
def get_workflows():
    return _wrap(queries.list_workflows)


@router.get("/workflows/search")
def search(q: str):
    if not q or len(q.strip()) < 2:
        return []
    return _wrap(queries.search_workflows, q.strip())


@router.get("/workflows/{workflow_id}")
def get_workflow(workflow_id: str):
    detail = _wrap(queries.get_workflow_detail, workflow_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"No workflow with id '{workflow_id}'")
    return detail


@router.get("/blast-radius/{service_id}")
def get_blast_radius(service_id: str):
    services = _wrap(queries.list_services)
    service = next((s for s in services if s["id"] == service_id), None)
    if not service:
        raise HTTPException(status_code=404, detail=f"No service with id '{service_id}'")

    affected = _wrap(queries.blast_radius, service_id)
    longest_chain = _wrap(queries.longest_cascade_chain, service_id)
    team_count = len({t for row in affected for t in row["teams"]})

    summary = generate_incident_summary(service["name"], affected, longest_chain)

    return {
        "service_id": service_id,
        "service_name": service["name"],
        "affected_workflows": [
            {
                "workflow_id": row["workflowId"],
                "workflow_name": row["workflowName"],
                "criticality": row["criticality"],
                "hops_from_failure": row["hopsFromFailure"],
                "teams": row["teams"],
            }
            for row in affected
        ],
        "affected_team_count": team_count,
        "longest_chain": (
            {"chain": longest_chain["chain"], "chain_length": longest_chain["chainLength"]}
            if longest_chain
            else None
        ),
        "ai_summary": summary,
    }


@router.get("/overview")
def get_overview():
    return _wrap(queries.graph_overview)
