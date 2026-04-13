from decimal import Decimal
from typing import Iterable, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.application.repositories import (
    InvoiceRepository,
    PropertyRepository,
    TechnicianRepository,
    TenantRepository,
    TicketRepository,
    UnitRepository,
)
from app.domain.enums import TicketPriority, TicketStatus
from app.domain.exceptions import NotFoundError
from app.domain.models import (
    Invoice,
    MaintenanceTicket,
    Property,
    Technician,
    Tenant,
    Unit,
)
from app.infrastructure.models import (
    InvoiceModel,
    MaintenanceTicketModel,
    PropertyModel,
    TechnicianModel,
    TenantModel,
    UnitModel,
)


def _ticket_from_model(model: MaintenanceTicketModel) -> MaintenanceTicket:
    return MaintenanceTicket(
        id=model.id,
        title=model.title,
        description=model.description,
        unit_id=model.unit_id,
        tenant_id=model.tenant_id,
        technician_id=model.technician_id,
        status=TicketStatus(model.status),
        priority=TicketPriority(model.priority) if model.priority else TicketPriority.MEDIUM,
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


def _invoice_from_model(model: InvoiceModel) -> Invoice:
    return Invoice(
        id=model.id,
        ticket_id=model.ticket_id,
        amount=Decimal(model.amount),
        paid=model.paid,
        created_at=model.created_at,
        paid_at=model.paid_at,
    )


def _property_from_model(model: PropertyModel) -> Property:
    return Property(id=model.id, name=model.name, address=model.address)


def _unit_from_model(model: UnitModel) -> Unit:
    return Unit(id=model.id, property_id=model.property_id, name=model.name, floor=model.floor)


def _tenant_from_model(model: TenantModel) -> Tenant:
    return Tenant(id=model.id, name=model.name, email=model.email, unit_id=model.unit_id)


def _technician_from_model(model: TechnicianModel) -> Technician:
    return Technician(id=model.id, name=model.name, expertise=model.expertise)


class SqlAlchemyPropertyRepository(PropertyRepository):
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, property_: Property) -> Property:
        model = PropertyModel(name=property_.name, address=property_.address)
        self.session.add(model)
        self.session.flush()
        return _property_from_model(model)

    def get(self, property_id: int) -> Property:
        model = self.session.get(PropertyModel, property_id)
        if model is None:
            raise NotFoundError("Property not found")
        return _property_from_model(model)

    def list(self) -> Iterable[Property]:
        return [
            _property_from_model(row)
            for row in self.session.scalars(select(PropertyModel)).all()
        ]


class SqlAlchemyUnitRepository(UnitRepository):
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, unit: Unit) -> Unit:
        model = UnitModel(property_id=unit.property_id, name=unit.name, floor=unit.floor)
        self.session.add(model)
        self.session.flush()
        return _unit_from_model(model)

    def get(self, unit_id: int) -> Unit:
        model = self.session.get(UnitModel, unit_id)
        if model is None:
            raise NotFoundError("Unit not found")
        return _unit_from_model(model)

    def list(self) -> Iterable[Unit]:
        return [_unit_from_model(row) for row in self.session.scalars(select(UnitModel)).all()]


class SqlAlchemyTenantRepository(TenantRepository):
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, tenant: Tenant) -> Tenant:
        model = TenantModel(name=tenant.name, email=tenant.email, unit_id=tenant.unit_id)
        self.session.add(model)
        self.session.flush()
        return _tenant_from_model(model)

    def get(self, tenant_id: int) -> Tenant:
        model = self.session.get(TenantModel, tenant_id)
        if model is None:
            raise NotFoundError("Tenant not found")
        return _tenant_from_model(model)

    def list(self) -> Iterable[Tenant]:
        return [_tenant_from_model(row) for row in self.session.scalars(select(TenantModel)).all()]


class SqlAlchemyTechnicianRepository(TechnicianRepository):
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, technician: Technician) -> Technician:
        model = TechnicianModel(name=technician.name, expertise=technician.expertise)
        self.session.add(model)
        self.session.flush()
        return _technician_from_model(model)

    def get(self, technician_id: int) -> Technician:
        model = self.session.get(TechnicianModel, technician_id)
        if model is None:
            raise NotFoundError("Technician not found")
        return _technician_from_model(model)

    def list(self) -> Iterable[Technician]:
        return [
            _technician_from_model(row)
            for row in self.session.scalars(select(TechnicianModel)).all()
        ]


class SqlAlchemyTicketRepository(TicketRepository):
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, ticket: MaintenanceTicket) -> MaintenanceTicket:
        model = MaintenanceTicketModel(
            title=ticket.title,
            description=ticket.description,
            unit_id=ticket.unit_id,
            tenant_id=ticket.tenant_id,
            technician_id=ticket.technician_id,
            status=str(ticket.status.value),
            priority=str(ticket.priority.value),
        )
        self.session.add(model)
        self.session.flush()
        return _ticket_from_model(model)

    def update(self, ticket: MaintenanceTicket) -> MaintenanceTicket:
        model = self.session.get(MaintenanceTicketModel, ticket.id)
        if model is None:
            raise NotFoundError("Ticket not found")
        model.title = ticket.title
        model.description = ticket.description
        model.unit_id = ticket.unit_id
        model.tenant_id = ticket.tenant_id
        model.technician_id = ticket.technician_id
        model.status = ticket.status.value
        model.priority = ticket.priority.value
        model.updated_at = ticket.updated_at
        self.session.add(model)
        self.session.flush()
        return _ticket_from_model(model)

    def get(self, ticket_id: int) -> MaintenanceTicket:
        model = self.session.get(MaintenanceTicketModel, ticket_id)
        if model is None:
            raise NotFoundError("Ticket not found")
        return _ticket_from_model(model)

    def list(self, status: Optional[str] = None) -> Iterable[MaintenanceTicket]:
        query = select(MaintenanceTicketModel)
        if status:
            query = query.where(MaintenanceTicketModel.status == status)
        return [_ticket_from_model(row) for row in self.session.scalars(query).all()]


class SqlAlchemyInvoiceRepository(InvoiceRepository):
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, invoice: Invoice) -> Invoice:
        model = InvoiceModel(
            ticket_id=invoice.ticket_id,
            amount=invoice.amount,
            paid=invoice.paid,
        )
        self.session.add(model)
        self.session.flush()
        return _invoice_from_model(model)

    def update(self, invoice: Invoice) -> Invoice:
        model = self.session.get(InvoiceModel, invoice.id)
        if model is None:
            raise NotFoundError("Invoice not found")
        model.paid = invoice.paid
        model.paid_at = invoice.paid_at
        self.session.flush()
        return _invoice_from_model(model)

    def get(self, invoice_id: int) -> Invoice:
        model = self.session.get(InvoiceModel, invoice_id)
        if model is None:
            raise NotFoundError("Invoice not found")
        return _invoice_from_model(model)

    def get_by_ticket(self, ticket_id: int) -> Optional[Invoice]:
        model = self.session.scalar(select(InvoiceModel).where(InvoiceModel.ticket_id == ticket_id))
        return _invoice_from_model(model) if model else None

    def list(self) -> Iterable[Invoice]:
        return [
            _invoice_from_model(row)
            for row in self.session.scalars(select(InvoiceModel)).all()
        ]
