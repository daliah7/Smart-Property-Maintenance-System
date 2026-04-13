from decimal import Decimal
from typing import Optional

from app.application.repositories import (
    InvoiceRepository,
    TicketRepository,
    TechnicianRepository,
    TenantRepository,
    UnitRepository,
)
from app.domain.enums import TicketPriority, TicketStatus, infer_priority
from app.domain.exceptions import BusinessRuleViolationError, InvalidStatusTransitionError
from app.domain.models import Invoice, MaintenanceTicket, Technician


class TicketLifecycleService:
    def __init__(
        self,
        ticket_repository: TicketRepository,
        technician_repository: TechnicianRepository,
        unit_repository: UnitRepository,
        tenant_repository: TenantRepository,
    ):
        self.ticket_repository = ticket_repository
        self.technician_repository = technician_repository
        self.unit_repository = unit_repository
        self.tenant_repository = tenant_repository

    def create_ticket(
        self,
        title: str,
        description: str,
        unit_id: int,
        tenant_id: Optional[int] = None,
        priority: Optional[TicketPriority] = None,
    ) -> MaintenanceTicket:
        self.unit_repository.get(unit_id)
        if tenant_id is not None:
            tenant = self.tenant_repository.get(tenant_id)
            if tenant.unit_id != unit_id:
                raise BusinessRuleViolationError(
                    "Tenant must be registered in the ticket unit.",
                )
        ticket = MaintenanceTicket(
            id=0,
            title=title,
            description=description,
            unit_id=unit_id,
            tenant_id=tenant_id,
            technician_id=None,
            priority=priority if priority is not None else infer_priority(title, description),
        )
        return self.ticket_repository.add(ticket)

    def auto_assign_ticket(self, ticket_id: int) -> MaintenanceTicket:
        """Assign the best-matching technician based on expertise keywords."""
        ticket = self.ticket_repository.get(ticket_id)
        if ticket.status != TicketStatus.OPEN:
            raise InvalidStatusTransitionError(
                "Auto-assign only works on OPEN tickets."
            )
        technicians: list[Technician] = list(self.technician_repository.list())
        if not technicians:
            raise BusinessRuleViolationError("No technicians available for auto-assignment.")

        text = f"{ticket.title} {ticket.description}".lower()

        def score(tech: Technician) -> int:
            return sum(
                2 if kw in text.split() else (1 if kw[:4] in text else 0)
                for kw in tech.expertise.lower().split()
            )

        best = max(technicians, key=score)
        ticket.assign(best.id)
        return self.ticket_repository.update(ticket)

    def assign_ticket(self, ticket_id: int, technician_id: int) -> MaintenanceTicket:
        ticket = self.ticket_repository.get(ticket_id)
        self.technician_repository.get(technician_id)
        ticket.assign(technician_id)
        return self.ticket_repository.update(ticket)

    def start_ticket(self, ticket_id: int) -> MaintenanceTicket:
        ticket = self.ticket_repository.get(ticket_id)
        ticket.start()
        return self.ticket_repository.update(ticket)

    def resolve_ticket(self, ticket_id: int) -> MaintenanceTicket:
        ticket = self.ticket_repository.get(ticket_id)
        ticket.resolve()
        return self.ticket_repository.update(ticket)

    def close_ticket(self, ticket_id: int) -> MaintenanceTicket:
        ticket = self.ticket_repository.get(ticket_id)
        ticket.close()
        return self.ticket_repository.update(ticket)


class BillingService:
    def __init__(
        self,
        ticket_repository: TicketRepository,
        invoice_repository: InvoiceRepository,
    ):
        self.ticket_repository = ticket_repository
        self.invoice_repository = invoice_repository

    def create_invoice(self, ticket_id: int, amount: Decimal) -> Invoice:
        ticket = self.ticket_repository.get(ticket_id)
        if not ticket.can_create_invoice():
            raise BusinessRuleViolationError("Invoice can only be created for resolved tickets.")
        if self.invoice_repository.get_by_ticket(ticket_id) is not None:
            raise BusinessRuleViolationError("An invoice already exists for this ticket.")
        invoice = Invoice(id=0, ticket_id=ticket_id, amount=amount)
        return self.invoice_repository.add(invoice)

    def pay_invoice(self, invoice_id: int) -> Invoice:
        invoice = self.invoice_repository.get(invoice_id)
        invoice.mark_paid()
        return self.invoice_repository.update(invoice)
