from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from app.domain.enums import ALLOWED_STATUS_TRANSITIONS, TicketPriority, TicketStatus
from app.domain.exceptions import BusinessRuleViolationError, InvalidStatusTransitionError


@dataclass
class Property:
    id: int
    name: str
    address: str


@dataclass
class Unit:
    id: int
    property_id: int
    name: str
    floor: str


@dataclass
class Tenant:
    id: int
    name: str
    email: str
    unit_id: int


@dataclass
class Technician:
    id: int
    name: str
    expertise: str


@dataclass
class MaintenanceTicket:
    id: int
    title: str
    description: str
    unit_id: int
    tenant_id: Optional[int]
    technician_id: Optional[int]
    status: TicketStatus = TicketStatus.OPEN
    priority: TicketPriority = TicketPriority.MEDIUM
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def assign(self, technician_id: int) -> None:
        self._transition_status(TicketStatus.ASSIGNED)
        self.technician_id = technician_id
        self.updated_at = datetime.now(timezone.utc)

    def start(self) -> None:
        self._transition_status(TicketStatus.IN_PROGRESS)
        self.updated_at = datetime.now(timezone.utc)

    def resolve(self) -> None:
        self._transition_status(TicketStatus.RESOLVED)
        self.updated_at = datetime.now(timezone.utc)

    def close(self) -> None:
        self._transition_status(TicketStatus.CLOSED)
        self.updated_at = datetime.now(timezone.utc)

    def can_create_invoice(self) -> bool:
        return self.status == TicketStatus.RESOLVED

    def _transition_status(self, next_status: TicketStatus) -> None:
        allowed = ALLOWED_STATUS_TRANSITIONS.get(self.status, [])
        if next_status not in allowed:
            raise InvalidStatusTransitionError(
                f"Cannot move ticket from {self.status} to {next_status}.",
            )
        self.status = next_status


@dataclass
class Invoice:
    id: int
    ticket_id: int
    amount: Decimal
    paid: bool = False
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    paid_at: Optional[datetime] = None

    def mark_paid(self) -> None:
        if self.paid:
            raise BusinessRuleViolationError("Invoice is already paid.")
        self.paid = True
        self.paid_at = datetime.now(timezone.utc)
