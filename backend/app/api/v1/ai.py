from collections import Counter
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.database import get_session
from app.infrastructure.models import InvoiceModel, MaintenanceTicketModel, TechnicianModel

router = APIRouter()

SLA_HOURS: dict[str, float] = {"HIGH": 4.0, "MEDIUM": 24.0, "LOW": 72.0}
PRIORITY_DOT = {"HIGH": "🔴", "MEDIUM": "🟡", "LOW": "🟢"}
STATUS_DOT = {"OPEN": "🟡", "ASSIGNED": "🔵", "IN_PROGRESS": "🟠", "RESOLVED": "🟢", "CLOSED": "⚫"}


def _utc(dt: datetime) -> datetime:
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


@router.post("/chat", response_model=ChatResponse)
def ai_chat(req: ChatRequest, session: Session = Depends(get_session)) -> ChatResponse:
    msg = req.message.lower().strip()
    tickets = session.scalars(select(MaintenanceTicketModel)).all()
    technicians = session.scalars(select(TechnicianModel)).all()
    invoices = session.scalars(select(InvoiceModel)).all()
    tech_map = {t.id: t.name for t in technicians}

    # Critical HIGH tickets
    if any(kw in msg for kw in ["kritisch", "critical", "high", "notfall", "emergency", "dringend", "gefahr"]):
        crit = [t for t in tickets if t.priority == "HIGH" and t.status not in ("RESOLVED", "CLOSED")]
        if not crit:
            return ChatResponse(reply="✅ Keine offenen kritischen Tickets im System.")
        lines = [f"🔴 **{len(crit)} kritische Tickets offen:**"]
        for t in crit[:5]:
            lines.append(f"• #{t.id} — {t.title} [{t.status}]")
        if len(crit) > 5:
            lines.append(f"  … und {len(crit) - 5} weitere")
        return ChatResponse(reply="\n".join(lines))

    # Overloaded technicians
    if any(kw in msg for kw in ["überlastet", "overloaded", "auslastung", "workload", "busy", "belastet"]):
        load: dict[int, int] = {}
        for t in tickets:
            if t.technician_id and t.status in ("ASSIGNED", "IN_PROGRESS"):
                load[t.technician_id] = load.get(t.technician_id, 0) + 1
        if not load:
            return ChatResponse(reply="✅ Kein Techniker hat aktuell aktive Tickets.")
        lines = ["⚠️ **Techniker-Auslastung (aktive Tickets):**"]
        for tid, count in sorted(load.items(), key=lambda x: x[1], reverse=True)[:5]:
            bar = "▓" * min(count, 8) + "░" * max(0, 8 - count)
            lines.append(f"• {tech_map.get(tid, f'#{tid}')}: {bar} {count}")
        return ChatResponse(reply="\n".join(lines))

    # Open tickets
    if any(kw in msg for kw in ["offen", "open", "neu", "new", "unbearbeitet"]):
        open_t = [t for t in tickets if t.status == "OPEN"]
        if not open_t:
            return ChatResponse(reply="✅ Keine offenen Tickets.")
        prio_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
        sorted_t = sorted(open_t, key=lambda x: prio_order.get(x.priority, 1))
        lines = [f"📋 **{len(open_t)} offene Tickets:**"]
        for t in sorted_t[:6]:
            lines.append(f"• {PRIORITY_DOT.get(t.priority, '🟡')} #{t.id} — {t.title}")
        return ChatResponse(reply="\n".join(lines))

    # Cost summary
    if any(kw in msg for kw in ["kosten", "cost", "rechnung", "invoice", "geld", "chf", "budget"]):
        total = sum(float(inv.amount) for inv in invoices)
        paid = sum(float(inv.amount) for inv in invoices if inv.paid)
        return ChatResponse(
            reply=f"💰 **Kostenzusammenfassung:**\n"
                  f"• Gesamtkosten: CHF {total:,.2f}\n"
                  f"• Bezahlt: CHF {paid:,.2f}\n"
                  f"• Offene Rechnungen: CHF {total - paid:,.2f}\n"
                  f"• Anzahl Rechnungen: {len(invoices)}"
        )

    # Escalated / SLA
    if any(kw in msg for kw in ["eskaliert", "escalated", "sla", "frist", "überfällig", "overdue", "at risk", "risk"]):
        now = datetime.now(timezone.utc)
        escalated = []
        at_risk = []
        for t in tickets:
            if t.status in ("RESOLVED", "CLOSED"):
                continue
            limit = SLA_HOURS.get(t.priority, 24.0)
            elapsed = (_utc(now) - _utc(t.created_at)).total_seconds() / 3600
            if elapsed > limit:
                escalated.append((t, elapsed - limit))
            elif elapsed > limit * 0.8:
                at_risk.append(t)
        if not escalated and not at_risk:
            return ChatResponse(reply="✅ Alle SLAs eingehalten. Keine eskalierten Tickets.")
        lines = []
        if escalated:
            lines.append(f"🚨 **{len(escalated)} eskaliert (SLA überschritten):**")
            for t, over in sorted(escalated, key=lambda x: x[1], reverse=True)[:4]:
                lines.append(f"• {PRIORITY_DOT.get(t.priority,'🟡')} #{t.id} — {t.title} ({over:.0f}h überfällig)")
        if at_risk:
            lines.append(f"\n⚠️ **{len(at_risk)} At Risk:**")
            for t in at_risk[:3]:
                lines.append(f"• {PRIORITY_DOT.get(t.priority,'🟡')} #{t.id} — {t.title}")
        return ChatResponse(reply="\n".join(lines))

    # Status overview
    if any(kw in msg for kw in ["status", "zusammenfassung", "summary", "übersicht", "overview", "statistik", "stats"]):
        cnt = Counter(t.status for t in tickets)
        prio = Counter(t.priority for t in tickets)
        total_cost = sum(float(inv.amount) for inv in invoices)
        lines = [f"📊 **System-Übersicht — {len(tickets)} Tickets gesamt:**\n"]
        for s in ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"]:
            if s in cnt:
                lines.append(f"  {STATUS_DOT.get(s,'⚪')} {s}: {cnt[s]}")
        lines.append(f"\n**Prioritäten:** 🔴 {prio.get('HIGH', 0)} · 🟡 {prio.get('MEDIUM', 0)} · 🟢 {prio.get('LOW', 0)}")
        lines.append(f"**Gesamtkosten:** CHF {total_cost:,.2f}")
        lines.append(f"**Techniker:** {len(technicians)}")
        return ChatResponse(reply="\n".join(lines))

    # Technicians
    if any(kw in msg for kw in ["techniker", "technician", "fachkraft", "specialist", "wer"]):
        lines = [f"👷 **{len(technicians)} Techniker:**"]
        for tech in technicians:
            active = sum(1 for t in tickets if t.technician_id == tech.id and t.status in ("ASSIGNED", "IN_PROGRESS"))
            done = sum(1 for t in tickets if t.technician_id == tech.id and t.status in ("RESOLVED", "CLOSED"))
            status = "🟢 frei" if active == 0 else f"🟠 {active} aktiv"
            lines.append(f"• {tech.name} [{tech.expertise.split()[0]}] — {status}, {done} erledigt")
        return ChatResponse(reply="\n".join(lines[:12]))

    # Default help response
    cnt_open = sum(1 for t in tickets if t.status == "OPEN")
    cnt_active = sum(1 for t in tickets if t.status in ("ASSIGNED", "IN_PROGRESS"))
    now2 = datetime.now(timezone.utc)
    esc = sum(
        1 for t in tickets
        if t.status not in ("RESOLVED", "CLOSED")
        and (_utc(now2) - _utc(t.created_at)).total_seconds() / 3600 > SLA_HOURS.get(t.priority, 24.0)
    )
    lines = [
        "👋 **KI-Assistent — Smart Property Maintenance**",
        "",
        f"📊 {len(tickets)} Tickets · {cnt_open} offen · {cnt_active} aktiv · {esc} eskaliert",
        "",
        "**Mögliche Anfragen:**",
        '• "Kritische Tickets anzeigen"',
        '• "Wer ist überlastet?"',
        '• "Kosten-Übersicht"',
        '• "Eskalierte Tickets"',
        '• "System-Übersicht"',
        '• "Offene Tickets"',
        '• "Alle Techniker anzeigen"',
    ]
    return ChatResponse(reply="\n".join(lines))
