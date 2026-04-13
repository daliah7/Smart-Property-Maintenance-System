from dataclasses import asdict
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.application.schemas import TechnicianCreate, TechnicianRead
from app.domain.models import Technician
from app.domain.exceptions import NotFoundError
from app.infrastructure.database import get_session
from app.infrastructure.repositories import SqlAlchemyTechnicianRepository

router = APIRouter()


@router.post("/", response_model=TechnicianRead, status_code=status.HTTP_201_CREATED)
def create_technician(
    data: TechnicianCreate, session: Session = Depends(get_session)
) -> TechnicianRead:
    repo = SqlAlchemyTechnicianRepository(session)
    technician = Technician(id=0, **data.model_dump())
    saved = repo.add(technician)
    return TechnicianRead(**asdict(saved))


@router.get("/", response_model=List[TechnicianRead])
def list_technicians(session: Session = Depends(get_session)) -> List[TechnicianRead]:
    repo = SqlAlchemyTechnicianRepository(session)
    return [TechnicianRead(**asdict(technician)) for technician in repo.list()]


@router.get("/{technician_id}", response_model=TechnicianRead)
def get_technician(technician_id: int, session: Session = Depends(get_session)) -> TechnicianRead:
    repo = SqlAlchemyTechnicianRepository(session)
    try:
        technician = repo.get(technician_id)
        return TechnicianRead(**asdict(technician))
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
