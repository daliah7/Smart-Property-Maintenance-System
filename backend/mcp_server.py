"""
MCP server for Smart Property Maintenance System.

Exposes tickets, technicians, and properties as MCP tools and resources
so that AI assistants (Claude, Cursor, etc.) can query and manage the SPMS
without writing raw HTTP calls.

Usage:
    python backend/mcp_server.py          # stdio transport (default)
    fastmcp dev backend/mcp_server.py     # interactive inspector
"""

import os

import httpx
from fastmcp import FastMCP

BASE_URL = os.getenv(
    "SPMS_API_URL",
    "https://smart-property-maintenance-system.onrender.com/api",
)

mcp = FastMCP("SPMS – Smart Property Maintenance System")

# ── helpers ──────────────────────────────────────────────────────────────────


def _get(path: str) -> dict | list:
    with httpx.Client(timeout=30) as client:
        r = client.get(f"{BASE_URL}{path}")
        r.raise_for_status()
        return r.json()


def _post(path: str, body: dict) -> dict:
    with httpx.Client(timeout=30) as client:
        r = client.post(f"{BASE_URL}{path}", json=body)
        r.raise_for_status()
        return r.json()


def _patch(path: str, body: dict | None = None) -> dict:
    with httpx.Client(timeout=30) as client:
        r = client.patch(f"{BASE_URL}{path}", json=body or {})
        r.raise_for_status()
        return r.json()


# ── Ticket tools ─────────────────────────────────────────────────────────────


@mcp.tool()
def list_tickets(status: str | None = None) -> list[dict]:
    """Return all maintenance tickets. Optionally filter by status.

    Args:
        status: One of OPEN, IN_PROGRESS, RESOLVED, CLOSED (optional).
    """
    path = "/tickets"
    if status:
        path += f"?status={status.upper()}"
    return _get(path)


@mcp.tool()
def get_ticket(ticket_id: int) -> dict:
    """Fetch a single ticket by ID.

    Args:
        ticket_id: The numeric ticket ID.
    """
    return _get(f"/tickets/{ticket_id}")


@mcp.tool()
def create_ticket(
    title: str,
    description: str,
    unit_id: int,
    priority: str | None = None,
    reporter_name: str | None = None,
) -> dict:
    """Create a new maintenance ticket.

    Args:
        title: Short summary (3-160 chars).
        description: Detailed description of the issue.
        unit_id: ID of the property unit affected.
        priority: LOW, MEDIUM, HIGH, or URGENT (optional – auto-detected if omitted).
        reporter_name: Name of the person reporting the issue (optional).
    """
    body: dict = {"title": title, "description": description, "unit_id": unit_id}
    if priority:
        body["priority"] = priority.upper()
    if reporter_name:
        body["reporter_name"] = reporter_name
    return _post("/tickets/", body)


@mcp.tool()
def assign_ticket(ticket_id: int, technician_id: int) -> dict:
    """Manually assign a ticket to a specific technician.

    Args:
        ticket_id: The ticket to assign.
        technician_id: The technician who will handle the ticket.
    """
    return _patch(f"/tickets/{ticket_id}/assign", {"technician_id": technician_id})


@mcp.tool()
def auto_assign_ticket(ticket_id: int) -> dict:
    """Auto-assign a ticket to the best available technician using skill scoring.

    Args:
        ticket_id: The ticket to auto-assign.
    """
    return _patch(f"/tickets/{ticket_id}/auto-assign")


@mcp.tool()
def update_ticket_status(ticket_id: int, action: str) -> dict:
    """Transition a ticket to the next status.

    Args:
        ticket_id: The ticket to update.
        action: One of 'start', 'resolve', or 'close'.
    """
    allowed = {"start", "resolve", "close"}
    if action not in allowed:
        raise ValueError(f"action must be one of {allowed}")
    return _patch(f"/tickets/{ticket_id}/{action}")


@mcp.tool()
def get_ticket_history(ticket_id: int) -> list[dict]:
    """Return the audit-trail history of a ticket.

    Args:
        ticket_id: The ticket whose history to fetch.
    """
    return _get(f"/tickets/{ticket_id}/history")


# ── Technician tools ─────────────────────────────────────────────────────────


@mcp.tool()
def list_technicians() -> list[dict]:
    """Return all registered technicians with their expertise."""
    return _get("/technicians/")


@mcp.tool()
def create_technician(name: str, expertise: str) -> dict:
    """Register a new technician.

    Args:
        name: Full name (2-120 chars).
        expertise: Skill/trade description e.g. 'Plumbing', 'Electrical' (2-80 chars).
    """
    return _post("/technicians/", {"name": name, "expertise": expertise})


# ── Property / Unit tools ────────────────────────────────────────────────────


@mcp.tool()
def list_properties() -> list[dict]:
    """Return all registered properties."""
    return _get("/properties/")


@mcp.tool()
def create_property(name: str, address: str) -> dict:
    """Add a new property to the system.

    Args:
        name: Property name (2-120 chars).
        address: Full address (5-200 chars).
    """
    return _post("/properties/", {"name": name, "address": address})


@mcp.tool()
def list_units(property_id: int) -> list[dict]:
    """Return all units for a given property.

    Args:
        property_id: The property whose units to list.
    """
    return _get(f"/properties/{property_id}/units")


# ── Tenant tools ─────────────────────────────────────────────────────────────


@mcp.tool()
def list_tenants() -> list[dict]:
    """Return all tenants."""
    return _get("/tenants/")


# ── Resources ────────────────────────────────────────────────────────────────


@mcp.resource("spms://tickets/open")
def open_tickets_resource() -> str:
    """Live snapshot of all open tickets (OPEN + IN_PROGRESS)."""
    import json

    open_t = _get("/tickets?status=OPEN")
    in_prog = _get("/tickets?status=IN_PROGRESS")
    combined = open_t + in_prog  # type: ignore[operator]
    return json.dumps(combined, indent=2, default=str)


@mcp.resource("spms://technicians/all")
def technicians_resource() -> str:
    """Current list of all technicians and their expertise."""
    import json

    return json.dumps(_get("/technicians/"), indent=2, default=str)


@mcp.resource("spms://dashboard")
def dashboard_resource() -> str:
    """High-level system summary: ticket counts by status."""
    import json

    tickets: list = _get("/tickets")  # type: ignore[assignment]
    counts: dict[str, int] = {}
    for t in tickets:
        s = t.get("status", "UNKNOWN")
        counts[s] = counts.get(s, 0) + 1
    return json.dumps(
        {
            "total_tickets": len(tickets),
            "by_status": counts,
            "api_base": BASE_URL,
        },
        indent=2,
    )


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    mcp.run()
