from dataclasses import asdict
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.application.schemas import (
    InvoiceCreate,
    InvoiceRead,
    TicketAssign,
    TicketCreate,
    TicketRead,
)
from app.application.services import BillingService, TicketLifecycleService
from app.domain.enums import TicketStatus
from app.domain.exceptions import BusinessRuleViolationError, InvalidStatusTransitionError, NotFoundError
from app.infrastructure.database import get_session
from app.infrastructure.repositories import (
    SqlAlchemyInvoiceRepository,
    SqlAlchemyTicketRepository,
    SqlAlchemyTechnicianRepository,
    SqlAlchemyTenantRepository,
    SqlAlchemyUnitRepository,
)

router = APIRouter()


def _ticket_response(ticket) -> TicketRead:
    return TicketRead(**asdict(ticket))


@router.post("/", response_model=TicketRead, status_code=status.HTTP_201_CREATED)
def create_ticket(data: TicketCreate, session: Session = Depends(get_session)) -> TicketRead:
    ticket_repo = SqlAlchemyTicketRepository(session)
    unit_repo = SqlAlchemyUnitRepository(session)
    tenant_repo = SqlAlchemyTenantRepository(session)
    service = TicketLifecycleService(
        ticket_repo,
        SqlAlchemyTechnicianRepository(session),
        unit_repo,
        tenant_repo,
    )
    try:
        ticket = service.create_ticket(
            data.title, data.description, data.unit_id, data.tenant_id, data.priority
        )
        return _ticket_response(ticket)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except BusinessRuleViolationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/", response_model=List[TicketRead])
def list_tickets(
    status: Optional[TicketStatus] = None,
    session: Session = Depends(get_session),
) -> List[TicketRead]:
    repo = SqlAlchemyTicketRepository(session)
    tickets = repo.list(status.value if status is not None else None)
    return [_ticket_response(ticket) for ticket in tickets]


@router.get("/{ticket_id}", response_model=TicketRead)
def get_ticket(ticket_id: int, session: Session = Depends(get_session)) -> TicketRead:
    repo = SqlAlchemyTicketRepository(session)
    try:
        ticket = repo.get(ticket_id)
        return _ticket_response(ticket)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.patch("/{ticket_id}/assign", response_model=TicketRead)
def assign_ticket(
    ticket_id: int,
    data: TicketAssign,
    session: Session = Depends(get_session),
) -> TicketRead:
    ticket_repo = SqlAlchemyTicketRepository(session)
    service = TicketLifecycleService(
        ticket_repo,
        SqlAlchemyTechnicianRepository(session),
        SqlAlchemyUnitRepository(session),
        SqlAlchemyTenantRepository(session),
    )
    try:
        ticket = service.assign_ticket(ticket_id, data.technician_id)
        return _ticket_response(ticket)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except InvalidStatusTransitionError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except BusinessRuleViolationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.patch("/{ticket_id}/auto-assign", response_model=TicketRead)
def auto_assign_ticket(ticket_id: int, session: Session = Depends(get_session)) -> TicketRead:
    service = TicketLifecycleService(
        SqlAlchemyTicketRepository(session),
        SqlAlchemyTechnicianRepository(session),
        SqlAlchemyUnitRepository(session),
        SqlAlchemyTenantRepository(session),
    )
    try:
        ticket = service.auto_assign_ticket(ticket_id)
        return _ticket_response(ticket)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except InvalidStatusTransitionError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except BusinessRuleViolationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.patch("/{ticket_id}/start", response_model=TicketRead)
def start_ticket(ticket_id: int, session: Session = Depends(get_session)) -> TicketRead:
    ticket_repo = SqlAlchemyTicketRepository(session)
    service = TicketLifecycleService(
        ticket_repo,
        SqlAlchemyTechnicianRepository(session),
        SqlAlchemyUnitRepository(session),
        SqlAlchemyTenantRepository(session),
    )
    try:
        ticket = service.start_ticket(ticket_id)
        return _ticket_response(ticket)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except InvalidStatusTransitionError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except BusinessRuleViolationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.patch("/{ticket_id}/resolve", response_model=TicketRead)
def resolve_ticket(ticket_id: int, session: Session = Depends(get_session)) -> TicketRead:
    ticket_repo = SqlAlchemyTicketRepository(session)
    service = TicketLifecycleService(
        ticket_repo,
        SqlAlchemyTechnicianRepository(session),
        SqlAlchemyUnitRepository(session),
        SqlAlchemyTenantRepository(session),
    )
    try:
        ticket = service.resolve_ticket(ticket_id)
        return _ticket_response(ticket)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except InvalidStatusTransitionError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except BusinessRuleViolationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.patch("/{ticket_id}/close", response_model=TicketRead)
def close_ticket(ticket_id: int, session: Session = Depends(get_session)) -> TicketRead:
    ticket_repo = SqlAlchemyTicketRepository(session)
    service = TicketLifecycleService(
        ticket_repo,
        SqlAlchemyTechnicianRepository(session),
        SqlAlchemyUnitRepository(session),
        SqlAlchemyTenantRepository(session),
    )
    try:
        ticket = service.close_ticket(ticket_id)
        return _ticket_response(ticket)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except InvalidStatusTransitionError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except BusinessRuleViolationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post(
    "/{ticket_id}/invoice",
    response_model=InvoiceRead,
    status_code=status.HTTP_201_CREATED,
)
def create_ticket_invoice(
    ticket_id: int,
    data: InvoiceCreate,
    session: Session = Depends(get_session),
) -> InvoiceRead:
    invoice_repo = SqlAlchemyInvoiceRepository(session)
    ticket_repo = SqlAlchemyTicketRepository(session)
    service = BillingService(ticket_repo, invoice_repo)
    if data.amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Amount must be positive.")
    try:
        invoice = service.create_invoice(ticket_id, data.amount)
        return InvoiceRead(**invoice.__dict__)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except BusinessRuleViolationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/{ticket_id}/invoice", response_model=InvoiceRead)
def get_ticket_invoice(ticket_id: int, session: Session = Depends(get_session)) -> InvoiceRead:
    ticket_repo = SqlAlchemyTicketRepository(session)
    invoice_repo = SqlAlchemyInvoiceRepository(session)
    try:
        ticket_repo.get(ticket_id)
        invoice = invoice_repo.get_by_ticket(ticket_id)
        if invoice is None:
            raise NotFoundError("Invoice not found")
        return InvoiceRead(**asdict(invoice))
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
