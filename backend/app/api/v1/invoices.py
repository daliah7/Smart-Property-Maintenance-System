from dataclasses import asdict
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.application.schemas import InvoiceRead
from app.application.services import BillingService
from app.domain.exceptions import NotFoundError, BusinessRuleViolationError
from app.infrastructure.database import get_session
from app.infrastructure.repositories import SqlAlchemyInvoiceRepository, SqlAlchemyTicketRepository

router = APIRouter()


@router.get("/", response_model=List[InvoiceRead])
def list_invoices(session: Session = Depends(get_session)) -> List[InvoiceRead]:
    repo = SqlAlchemyInvoiceRepository(session)
    return [InvoiceRead(**asdict(invoice)) for invoice in repo.list()]


@router.patch("/{invoice_id}/pay", response_model=InvoiceRead)
def pay_invoice(invoice_id: int, session: Session = Depends(get_session)) -> InvoiceRead:
    invoice_repo = SqlAlchemyInvoiceRepository(session)
    ticket_repo = SqlAlchemyTicketRepository(session)
    service = BillingService(ticket_repo, invoice_repo)
    try:
        invoice = service.pay_invoice(invoice_id)
        return InvoiceRead(**asdict(invoice))
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except BusinessRuleViolationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
