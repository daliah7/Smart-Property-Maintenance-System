from decimal import Decimal

import pytest

from app.domain.enums import TicketPriority, TicketStatus, infer_priority
from app.domain.exceptions import InvalidStatusTransitionError, BusinessRuleViolationError
from app.domain.models import Invoice, MaintenanceTicket


def test_ticket_domain_status_transitions():
    ticket = MaintenanceTicket(id=1, title="Test", description="Problem", unit_id=1, tenant_id=None, technician_id=None)
    assert ticket.status == TicketStatus.OPEN

    ticket.assign(technician_id=2)
    assert ticket.status == TicketStatus.ASSIGNED
    assert ticket.technician_id == 2

    ticket.start()
    assert ticket.status == TicketStatus.IN_PROGRESS

    ticket.resolve()
    assert ticket.status == TicketStatus.RESOLVED

    ticket.close()
    assert ticket.status == TicketStatus.CLOSED


def test_ticket_invalid_transition():
    ticket = MaintenanceTicket(id=2, title="Test", description="Problem", unit_id=1, tenant_id=None, technician_id=None)
    with pytest.raises(InvalidStatusTransitionError):
        ticket.start()


def test_invoice_only_after_resolved_ticket():
    ticket = MaintenanceTicket(id=3, title="Test", description="Problem", unit_id=1, tenant_id=None, technician_id=None)
    invoice = Invoice(id=1, ticket_id=ticket.id, amount=Decimal("100.00"))

    assert not ticket.can_create_invoice()
    with pytest.raises(BusinessRuleViolationError):
        if not ticket.can_create_invoice():
            raise BusinessRuleViolationError("Invoice can only be created for resolved tickets.")

    ticket.assign(technician_id=2)
    ticket.start()
    ticket.resolve()
    assert ticket.can_create_invoice()
    assert invoice.ticket_id == ticket.id


def test_invoice_mark_paid():
    invoice = Invoice(id=2, ticket_id=1, amount=Decimal("70.00"))
    assert invoice.paid is False
    invoice.mark_paid()
    assert invoice.paid is True
    with pytest.raises(BusinessRuleViolationError):
        invoice.mark_paid()


# ── Priority inference tests ──────────────────────────────────────────────────

def test_infer_priority_high_on_emergency_keywords():
    assert infer_priority("Wasserrohrbruch im Keller", "Wasser läuft aus") == TicketPriority.HIGH


def test_infer_priority_high_on_electrical_keywords():
    assert infer_priority("Stromausfall Wohnung", "Kurzschluss im Sicherungskasten") == TicketPriority.HIGH


def test_infer_priority_high_on_heating_failure():
    assert infer_priority("Heizung defekt", "Heizungsausfall — dringend") == TicketPriority.HIGH


def test_infer_priority_low_on_routine_keywords():
    assert infer_priority("Routinewartung Heizanlage", "Jährliche Wartung und Inspektion") == TicketPriority.LOW


def test_infer_priority_medium_as_default():
    assert infer_priority("Türklinke locker", "Die Klinke wackelt leicht") == TicketPriority.MEDIUM


def test_ticket_default_priority_is_medium():
    ticket = MaintenanceTicket(id=1, title="Test", description="Problem", unit_id=1, tenant_id=None, technician_id=None)
    assert ticket.priority == TicketPriority.MEDIUM


def test_ticket_priority_can_be_set_to_high():
    ticket = MaintenanceTicket(
        id=1, title="Test", description="Problem",
        unit_id=1, tenant_id=None, technician_id=None,
        priority=TicketPriority.HIGH,
    )
    assert ticket.priority == TicketPriority.HIGH
