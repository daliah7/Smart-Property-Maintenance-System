from __future__ import annotations

from typing import Iterable, Optional, Protocol

from app.domain.models import (
    Invoice,
    MaintenanceTicket,
    Property,
    Tenant,
    Technician,
    Unit,
)


class PropertyRepository(Protocol):
    def add(self, property_: Property) -> Property:
        ...

    def get(self, property_id: int) -> Property:
        ...

    def list(self) -> Iterable[Property]:
        ...


class UnitRepository(Protocol):
    def add(self, unit: Unit) -> Unit:
        ...

    def get(self, unit_id: int) -> Unit:
        ...

    def list(self) -> Iterable[Unit]:
        ...


class TenantRepository(Protocol):
    def add(self, tenant: Tenant) -> Tenant:
        ...

    def get(self, tenant_id: int) -> Tenant:
        ...

    def list(self) -> Iterable[Tenant]:
        ...


class TechnicianRepository(Protocol):
    def add(self, technician: Technician) -> Technician:
        ...

    def get(self, technician_id: int) -> Technician:
        ...

    def list(self) -> Iterable[Technician]:
        ...


class TicketRepository(Protocol):
    def add(self, ticket: MaintenanceTicket) -> MaintenanceTicket:
        ...

    def update(self, ticket: MaintenanceTicket) -> MaintenanceTicket:
        ...

    def get(self, ticket_id: int) -> MaintenanceTicket:
        ...

    def list(self, status: Optional[str] = None) -> Iterable[MaintenanceTicket]:
        ...


class InvoiceRepository(Protocol):
    def add(self, invoice: Invoice) -> Invoice:
        ...

    def update(self, invoice: Invoice) -> Invoice:
        ...

    def get(self, invoice_id: int) -> Invoice:
        ...

    def get_by_ticket(self, ticket_id: int) -> Optional[Invoice]:
        ...

    def list(self) -> Iterable[Invoice]:
        ...
