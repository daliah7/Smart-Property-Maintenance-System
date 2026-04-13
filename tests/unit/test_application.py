from decimal import Decimal

import pytest

from app.application.services import BillingService, TicketLifecycleService
from app.domain.enums import TicketPriority
from app.domain.exceptions import BusinessRuleViolationError, InvalidStatusTransitionError, NotFoundError
from app.domain.models import Invoice, MaintenanceTicket, Technician, Tenant, Unit


class InMemoryTicketRepo:
    def __init__(self):
        self.tickets = {}
        self.counter = 1

    def add(self, ticket: MaintenanceTicket) -> MaintenanceTicket:
        ticket.id = self.counter
        self.counter += 1
        self.tickets[ticket.id] = ticket
        return ticket

    def update(self, ticket: MaintenanceTicket) -> MaintenanceTicket:
        if ticket.id not in self.tickets:
            raise NotFoundError("Ticket not found")
        self.tickets[ticket.id] = ticket
        return ticket

    def get(self, ticket_id: int) -> MaintenanceTicket:
        if ticket_id not in self.tickets:
            raise NotFoundError("Ticket not found")
        return self.tickets[ticket_id]

    def list(self, status=None):
        return [ticket for ticket in self.tickets.values() if status is None or ticket.status.value == status]


class InMemoryRepoMixin:
    def __init__(self):
        self.data = {}
        self.counter = 1

    def add(self, entity):
        entity.id = self.counter
        self.data[self.counter] = entity
        self.counter += 1
        return entity

    def get(self, entity_id: int):
        entity = self.data.get(entity_id)
        if not entity:
            raise NotFoundError("Entity not found")
        return entity

    def list(self):
        return list(self.data.values())


class InMemoryTechnicianRepo(InMemoryRepoMixin):
    pass


class InMemoryTenantRepo(InMemoryRepoMixin):
    pass


class InMemoryUnitRepo(InMemoryRepoMixin):
    pass


class InMemoryInvoiceRepo:
    def __init__(self):
        self.invoices = {}
        self.counter = 1

    def add(self, invoice: Invoice) -> Invoice:
        invoice.id = self.counter
        self.counter += 1
        self.invoices[invoice.id] = invoice
        return invoice

    def update(self, invoice: Invoice) -> Invoice:
        if invoice.id not in self.invoices:
            raise NotFoundError("Invoice not found")
        self.invoices[invoice.id] = invoice
        return invoice

    def get(self, invoice_id: int) -> Invoice:
        invoice = self.invoices.get(invoice_id)
        if invoice is None:
            raise NotFoundError("Invoice not found")
        return invoice

    def get_by_ticket(self, ticket_id: int):
        for invoice in self.invoices.values():
            if invoice.ticket_id == ticket_id:
                return invoice
        return None

    def list(self):
        return list(self.invoices.values())


@pytest.fixture
def ticket_repo():
    return InMemoryTicketRepo()


@pytest.fixture
def technician_repo():
    repo = InMemoryTechnicianRepo()
    repo.add(Technician(id=0, name="Tech", expertise="Elektrik"))
    return repo


@pytest.fixture
def unit_repo():
    repo = InMemoryUnitRepo()
    repo.add(Unit(id=0, property_id=1, name="A1", floor="1"))
    return repo


@pytest.fixture
def tenant_repo(unit_repo):
    repo = InMemoryTenantRepo()
    repo.add(Tenant(id=0, name="Mieter", email="mieter@example.com", unit_id=1))
    return repo


def test_ticket_lifecycle_service_assign_start_resolve_close(ticket_repo, technician_repo, unit_repo, tenant_repo):
    service = TicketLifecycleService(ticket_repo, technician_repo, unit_repo, tenant_repo)
    ticket = service.create_ticket("Leckage", "Wasser tropft", unit_id=1, tenant_id=1)
    assert ticket.status.value == "OPEN"

    ticket = service.assign_ticket(ticket.id, 1)
    assert ticket.status.value == "ASSIGNED"
    assert ticket.technician_id == 1

    ticket = service.start_ticket(ticket.id)
    assert ticket.status.value == "IN_PROGRESS"

    ticket = service.resolve_ticket(ticket.id)
    assert ticket.status.value == "RESOLVED"

    ticket = service.close_ticket(ticket.id)
    assert ticket.status.value == "CLOSED"


def test_billing_service_rejects_invoice_before_resolved(ticket_repo):
    service = BillingService(ticket_repo, InMemoryInvoiceRepo())
    ticket = ticket_repo.add(MaintenanceTicket(id=0, title="Strom", description="Ausfall", unit_id=1, tenant_id=None, technician_id=None))
    with pytest.raises(BusinessRuleViolationError):
        service.create_invoice(ticket.id, Decimal("50.00"))


def test_billing_service_creates_and_pays_invoice(ticket_repo):
    ticket = ticket_repo.add(MaintenanceTicket(id=0, title="Tür", description="Scharnier", unit_id=1, tenant_id=None, technician_id=None))
    ticket.assign(1)
    ticket.start()
    ticket.resolve()

    invoice_repo = InMemoryInvoiceRepo()
    service = BillingService(ticket_repo, invoice_repo)
    invoice = service.create_invoice(ticket.id, Decimal("120.00"))
    assert invoice.paid is False

    paid = service.pay_invoice(invoice.id)
    assert paid.paid is True


def test_invalid_status_transition_raises_error(ticket_repo):
    ticket = ticket_repo.add(
        MaintenanceTicket(id=0, title="Heizung", description="Kalt", unit_id=1, tenant_id=None, technician_id=None)
    )
    with pytest.raises(InvalidStatusTransitionError):
        ticket.start()  # OPEN -> IN_PROGRESS ist nicht erlaubt


def test_billing_service_prevents_duplicate_invoice(ticket_repo):
    ticket = ticket_repo.add(
        MaintenanceTicket(id=0, title="Fenster", description="Riss", unit_id=1, tenant_id=None, technician_id=None)
    )
    ticket.assign(1)
    ticket.start()
    ticket.resolve()

    invoice_repo = InMemoryInvoiceRepo()
    service = BillingService(ticket_repo, invoice_repo)
    service.create_invoice(ticket.id, Decimal("80.00"))

    with pytest.raises(BusinessRuleViolationError):
        service.create_invoice(ticket.id, Decimal("80.00"))


def test_pay_already_paid_invoice_raises_error(ticket_repo):
    ticket = ticket_repo.add(
        MaintenanceTicket(id=0, title="Schloss", description="Klemmt", unit_id=1, tenant_id=None, technician_id=None)
    )
    ticket.assign(1)
    ticket.start()
    ticket.resolve()

    invoice_repo = InMemoryInvoiceRepo()
    service = BillingService(ticket_repo, invoice_repo)
    invoice = service.create_invoice(ticket.id, Decimal("60.00"))
    service.pay_invoice(invoice.id)

    with pytest.raises(BusinessRuleViolationError):
        service.pay_invoice(invoice.id)


def test_auto_assign_picks_best_matching_technician(ticket_repo, unit_repo, tenant_repo):
    tech_repo = InMemoryTechnicianRepo()
    tech_repo.add(Technician(id=0, name="Lea", expertise="Elektrik Strom Kurzschluss"))
    tech_repo.add(Technician(id=0, name="Tim", expertise="Sanitär Heizung Wasser"))

    service = TicketLifecycleService(ticket_repo, tech_repo, unit_repo, tenant_repo)
    ticket = service.create_ticket("Stromausfall in der Küche", "Steckdose tot — Kurzschluss", unit_id=1)

    updated = service.auto_assign_ticket(ticket.id)

    assert updated.status.value == "ASSIGNED"
    assert updated.technician_id == 1  # Lea (Elektrik) hat höheren Score


def test_auto_assign_fallback_to_first_when_no_keyword_match(ticket_repo, unit_repo, tenant_repo):
    tech_repo = InMemoryTechnicianRepo()
    tech_repo.add(Technician(id=0, name="Max", expertise="Maler Wände"))

    service = TicketLifecycleService(ticket_repo, tech_repo, unit_repo, tenant_repo)
    ticket = service.create_ticket("Diverses Problem", "Kein spezifisches Stichwort", unit_id=1)

    updated = service.auto_assign_ticket(ticket.id)
    assert updated.status.value == "ASSIGNED"
    assert updated.technician_id == 1  # einziger Techniker → fallback


def test_auto_assign_fails_on_non_open_ticket(ticket_repo, unit_repo, tenant_repo):
    tech_repo = InMemoryTechnicianRepo()
    tech_repo.add(Technician(id=0, name="Lea", expertise="Elektrik"))

    service = TicketLifecycleService(ticket_repo, tech_repo, unit_repo, tenant_repo)
    ticket = service.create_ticket("Test", "Beschreibung", unit_id=1)
    service.auto_assign_ticket(ticket.id)  # → ASSIGNED

    with pytest.raises(InvalidStatusTransitionError):
        service.auto_assign_ticket(ticket.id)  # bereits ASSIGNED → Fehler


def test_auto_assign_fails_when_no_technicians(ticket_repo, unit_repo, tenant_repo):
    service = TicketLifecycleService(ticket_repo, InMemoryTechnicianRepo(), unit_repo, tenant_repo)
    ticket = service.create_ticket("Test", "Beschreibung", unit_id=1)

    with pytest.raises(BusinessRuleViolationError):
        service.auto_assign_ticket(ticket.id)


def test_create_ticket_infers_priority_from_keywords(ticket_repo, unit_repo, tenant_repo):
    service = TicketLifecycleService(ticket_repo, InMemoryTechnicianRepo(), unit_repo, tenant_repo)
    high = service.create_ticket("Rohrbruch Notfall", "Wasser läuft überall", unit_id=1)
    low  = service.create_ticket("Routinewartung", "Jährliche Inspektion", unit_id=1)
    mid  = service.create_ticket("Türklinke locker", "Wackelt etwas", unit_id=1)

    assert high.priority == TicketPriority.HIGH
    assert low.priority  == TicketPriority.LOW
    assert mid.priority  == TicketPriority.MEDIUM


def test_create_ticket_rejects_tenant_unit_mismatch(ticket_repo, technician_repo, unit_repo, tenant_repo):
    service = TicketLifecycleService(ticket_repo, technician_repo, unit_repo, tenant_repo)
    other_unit = unit_repo.add(Unit(id=0, property_id=1, name="B2", floor="2"))
    mismatched_tenant = tenant_repo.add(Tenant(id=0, name="Hans", email="hans@example.com", unit_id=other_unit.id))
    with pytest.raises(BusinessRuleViolationError):
        service.create_ticket(
            title="Türgriff gebrochen",
            description="Der Türgriff wackelt.",
            unit_id=1,
            tenant_id=mismatched_tenant.id,
        )
