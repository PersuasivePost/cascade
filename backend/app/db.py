"""
Thin wrapper around the official Neo4j Python driver, pointed at CognoDB.
CognoDB speaks openCypher over Bolt, so the stock driver works unmodified —
no custom SDK.

All queries go through `run_query`, which always uses parameters (never
string-concatenated Cypher) and turns connectivity failures into a single,
predictable exception the API layer can turn into a clean 503.
"""
from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Any

from neo4j import GraphDatabase, Driver
from neo4j.exceptions import ServiceUnavailable, AuthError, Neo4jError

from app.config import get_settings

logger = logging.getLogger("cascade.db")

_driver: Driver | None = None


class DatabaseUnavailable(RuntimeError):
    """Raised whenever CognoDB can't be reached or rejects auth."""


def get_driver() -> Driver:
    global _driver
    settings = get_settings()

    if not settings.is_configured:
        raise DatabaseUnavailable(
            "NEO4J_URI / NEO4J_USER / NEO4J_PASSWORD are not set. "
            "Copy .env.example to .env and fill in your CognoDB connection details."
        )

    if _driver is None:
        _driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )
    return _driver


def verify_connectivity() -> tuple[bool, str | None]:
    """Used by the /health endpoint. Never raises."""
    try:
        driver = get_driver()
        driver.verify_connectivity()
        return True, None
    except DatabaseUnavailable as e:
        return False, str(e)
    except AuthError:
        return False, "CognoDB rejected the credentials (check NEO4J_USER / NEO4J_PASSWORD)."
    except ServiceUnavailable:
        return False, "Could not reach the CognoDB instance (check NEO4J_URI and that it's running)."
    except Exception as e:  # noqa: BLE001 — surface anything unexpected to the health check
        return False, f"Unexpected database error: {e}"


@contextmanager
def get_session():
    try:
        driver = get_driver()
        session = driver.session()
    except DatabaseUnavailable:
        raise
    except (ServiceUnavailable, AuthError) as e:
        raise DatabaseUnavailable(f"CognoDB is unreachable: {e}") from e

    try:
        yield session
    finally:
        session.close()


def run_query(cypher: str, parameters: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    """Run a single parameterised Cypher query and return records as dicts."""
    with get_session() as session:
        try:
            result = session.run(cypher, parameters or {})
            return [record.data() for record in result]
        except ServiceUnavailable as e:
            raise DatabaseUnavailable(f"Lost connection to CognoDB mid-query: {e}") from e
        except Neo4jError as e:
            logger.error("Cypher error: %s", e)
            raise
