from dataclasses import asdict
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.application.schemas import UnitCreate, UnitRead
from app.domain.models import Unit
from app.domain.exceptions import NotFoundError
from app.infrastructure.database import get_session
from app.infrastructure.repositories import SqlAlchemyPropertyRepository, SqlAlchemyUnitRepository

router = APIRouter()


@router.post("/", response_model=UnitRead, status_code=status.HTTP_201_CREATED)
def create_unit(data: UnitCreate, session: Session = Depends(get_session)) -> UnitRead:
    property_repo = SqlAlchemyPropertyRepository(session)
    try:
        property_repo.get(data.property_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    repo = SqlAlchemyUnitRepository(session)
    unit = Unit(id=0, **data.model_dump())
    saved = repo.add(unit)
    return UnitRead(**asdict(saved))


@router.get("/", response_model=List[UnitRead])
def list_units(session: Session = Depends(get_session)) -> List[UnitRead]:
    repo = SqlAlchemyUnitRepository(session)
    return [UnitRead(**asdict(unit)) for unit in repo.list()]


@router.get("/{unit_id}", response_model=UnitRead)
def get_unit(unit_id: int, session: Session = Depends(get_session)) -> UnitRead:
    repo = SqlAlchemyUnitRepository(session)
    try:
        unit = repo.get(unit_id)
        return UnitRead(**asdict(unit))
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
