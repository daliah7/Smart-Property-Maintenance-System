from typing import List

from dataclasses import asdict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.application.schemas import PropertyCreate, PropertyRead
from app.domain.models import Property
from app.domain.exceptions import NotFoundError
from app.infrastructure.database import get_session
from app.infrastructure.repositories import SqlAlchemyPropertyRepository

router = APIRouter()


@router.post("/", response_model=PropertyRead, status_code=status.HTTP_201_CREATED)
def create_property(
    data: PropertyCreate, session: Session = Depends(get_session)
) -> PropertyRead:
    repo = SqlAlchemyPropertyRepository(session)
    property_model = repo.add(Property(id=0, **data.model_dump()))
    return PropertyRead(**asdict(property_model))


@router.get("/", response_model=List[PropertyRead])
def list_properties(session: Session = Depends(get_session)) -> List[PropertyRead]:
    repo = SqlAlchemyPropertyRepository(session)
    return [PropertyRead(**p.__dict__) for p in repo.list()]


@router.get("/{property_id}", response_model=PropertyRead)
def get_property(property_id: int, session: Session = Depends(get_session)) -> PropertyRead:
    repo = SqlAlchemyPropertyRepository(session)
    try:
        property_model = repo.get(property_id)
        return PropertyRead(**property_model.__dict__)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
