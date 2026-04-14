from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.domain.enums import TicketPriority


class PropertyCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    address: str = Field(min_length=5, max_length=200)


class PropertyRead(PropertyCreate):
    id: int


class UnitCreate(BaseModel):
    property_id: int
    name: str = Field(min_length=1, max_length=50)
    floor: str = Field(min_length=1, max_length=20)


class UnitRead(UnitCreate):
    id: int


class TenantCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    unit_id: int


class TenantRead(TenantCreate):
    id: int


class TechnicianCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    expertise: str = Field(min_length=2, max_length=80)


class TechnicianRead(TechnicianCreate):
    id: int


class TicketCreate(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    description: str = Field(min_length=5, max_length=1000)
    unit_id: int
    tenant_id: Optional[int] = None
    priority: Optional[TicketPriority] = None  # None → auto-inferred from keywords


class TicketRead(BaseModel):
    id: int
    title: str
    description: str
    unit_id: int
    tenant_id: Optional[int]
    technician_id: Optional[int]
    status: str
    priority: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TicketAssign(BaseModel):
    technician_id: int


class InvoiceCreate(BaseModel):
    amount: Decimal

    model_config = ConfigDict(json_encoders={Decimal: str})


class InvoiceRead(BaseModel):
    id: int
    ticket_id: int
    amount: Decimal
    paid: bool
    created_at: datetime
    paid_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class TicketHistoryRead(BaseModel):
    id: int
    ticket_id: int
    event: str
    note: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
