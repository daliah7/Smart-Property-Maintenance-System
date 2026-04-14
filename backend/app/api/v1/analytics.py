from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.database import get_session
from app.infrastructure.models import (
    InvoiceModel,
    MaintenanceTicketModel,
    PropertyModel,
    UnitModel,
)

router = APIRouter()

SLA_HOURS: dict[str, float] = {"HIGH": 4.0, "MEDIUM": 24.0, "LOW": 72.0}


def _utc(dt: datetime) -> datetime:
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


class PropertyMetric(BaseModel):
    property_name: str
    ticket_count: int
    total_cost: float


class MonthlyTrend(BaseModel):
    month: str
    count: int


class AnalyticsData(BaseModel):
    avg_resolution_hours: float
    sla_compliance_pct: float
    total_cost: float
    avg_cost_per_ticket: float
    tickets_per_property: List[PropertyMetric]
    monthly_trend: List[MonthlyTrend]
    escalated_count: int
    at_risk_count: int


@router.get("/", response_model=AnalyticsData)
def get_analytics(session: Session = Depends(get_session)) -> AnalyticsData:
    tickets = session.scalars(select(MaintenanceTicketModel)).all()
    invoices = session.scalars(select(InvoiceModel)).all()
    units = session.scalars(select(UnitModel)).all()
    properties = session.scalars(select(PropertyModel)).all()

    unit_to_prop: dict[int, int] = {u.id: u.property_id for u in units}
    prop_names: dict[int, str] = {p.id: p.name for p in properties}

    # Avg resolution time + SLA compliance
    closed = [t for t in tickets if t.status in ("RESOLVED", "CLOSED")]
    if closed:
        hrs_list = [
            (_utc(t.updated_at) - _utc(t.created_at)).total_seconds() / 3600
            for t in closed
        ]
        avg_resolution = sum(hrs_list) / len(hrs_list)
        sla_ok = sum(
            1 for t, h in zip(closed, hrs_list)
            if h <= SLA_HOURS.get(t.priority, 24.0)
        )
        sla_pct = sla_ok / len(closed) * 100
    else:
        avg_resolution = 0.0
        sla_pct = 100.0

    # Cost metrics
    inv_map: dict[int, float] = {inv.ticket_id: float(inv.amount) for inv in invoices}
    total_cost = sum(inv_map.values())
    avg_cost = total_cost / len(inv_map) if inv_map else 0.0

    # Tickets per property
    prop_counts: dict[int, int] = {}
    prop_costs: dict[int, float] = {}
    for t in tickets:
        pid = unit_to_prop.get(t.unit_id)
        if pid:
            prop_counts[pid] = prop_counts.get(pid, 0) + 1
            prop_costs[pid] = prop_costs.get(pid, 0.0) + inv_map.get(t.id, 0.0)

    tickets_per_property = sorted(
        [
            PropertyMetric(
                property_name=prop_names.get(pid, f"Objekt {pid}"),
                ticket_count=cnt,
                total_cost=round(prop_costs.get(pid, 0.0), 2),
            )
            for pid, cnt in prop_counts.items()
        ],
        key=lambda x: x.ticket_count,
        reverse=True,
    )

    # Monthly trend (last 8 months)
    monthly: dict[str, int] = {}
    for t in tickets:
        key = _utc(t.created_at).strftime("%Y-%m")
        monthly[key] = monthly.get(key, 0) + 1

    monthly_trend = [
        MonthlyTrend(month=datetime.strptime(k, "%Y-%m").strftime("%b %y"), count=v)
        for k, v in sorted(monthly.items())[-8:]
    ]

    # Escalated & At Risk
    now = datetime.now(timezone.utc)
    escalated = 0
    at_risk = 0
    for t in tickets:
        if t.status in ("RESOLVED", "CLOSED"):
            continue
        limit = SLA_HOURS.get(t.priority, 24.0)
        elapsed = (_utc(now) - _utc(t.created_at)).total_seconds() / 3600
        if elapsed > limit:
            escalated += 1
        elif elapsed > limit * 0.8:
            at_risk += 1

    return AnalyticsData(
        avg_resolution_hours=round(avg_resolution, 1),
        sla_compliance_pct=round(sla_pct, 1),
        total_cost=round(total_cost, 2),
        avg_cost_per_ticket=round(avg_cost, 2),
        tickets_per_property=tickets_per_property,
        monthly_trend=monthly_trend,
        escalated_count=escalated,
        at_risk_count=at_risk,
    )
