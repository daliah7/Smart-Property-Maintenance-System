from dataclasses import asdict
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.application.schemas import TenantCreate, TenantRead
from app.domain.models import Tenant
from app.domain.exceptions import NotFoundError
from app.infrastructure.database import get_session
from app.infrastructure.repositories import SqlAlchemyTenantRepository, SqlAlchemyUnitRepository

router = APIRouter()


@router.post("/", response_model=TenantRead, status_code=status.HTTP_201_CREATED)
def create_tenant(data: TenantCreate, session: Session = Depends(get_session)) -> TenantRead:
    unit_repo = SqlAlchemyUnitRepository(session)
    try:
        unit_repo.get(data.unit_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    repo = SqlAlchemyTenantRepository(session)
    tenant = Tenant(id=0, **data.model_dump())
    saved = repo.add(tenant)
    return TenantRead(**asdict(saved))


@router.get("/", response_model=List[TenantRead])
def list_tenants(session: Session = Depends(get_session)) -> List[TenantRead]:
    repo = SqlAlchemyTenantRepository(session)
    return [TenantRead(**asdict(tenant)) for tenant in repo.list()]


@router.get("/{tenant_id}", response_model=TenantRead)
def get_tenant(tenant_id: int, session: Session = Depends(get_session)) -> TenantRead:
    repo = SqlAlchemyTenantRepository(session)
    try:
        tenant = repo.get(tenant_id)
        return TenantRead(**asdict(tenant))
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
