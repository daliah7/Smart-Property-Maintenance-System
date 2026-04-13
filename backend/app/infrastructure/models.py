from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class PropertyModel(Base):
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    address = Column(String(200), nullable=False)
    units = relationship("UnitModel", back_populates="property", cascade="all, delete-orphan")


class UnitModel(Base):
    __tablename__ = "units"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)
    name = Column(String(100), nullable=False)
    floor = Column(String(50), nullable=False)

    property = relationship("PropertyModel", back_populates="units")
    tenants = relationship(
        "TenantModel",
        back_populates="unit",
        cascade="all, delete-orphan",
    )
    tickets = relationship(
        "MaintenanceTicketModel",
        back_populates="unit",
        cascade="all, delete-orphan",
    )


class TenantModel(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(120), nullable=False)
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=False)

    unit = relationship("UnitModel", back_populates="tenants")


class TechnicianModel(Base):
    __tablename__ = "technicians"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    expertise = Column(String(120), nullable=False)
    tickets = relationship("MaintenanceTicketModel", back_populates="technician")


class MaintenanceTicketModel(Base):
    __tablename__ = "maintenance_tickets"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    technician_id = Column(Integer, ForeignKey("technicians.id"), nullable=True)
    status = Column(String(20), nullable=False, default="OPEN")
    priority = Column(String(10), nullable=False, default="MEDIUM")
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    unit = relationship("UnitModel", back_populates="tickets")
    technician = relationship("TechnicianModel", back_populates="tickets")
    invoice = relationship("InvoiceModel", back_populates="ticket", uselist=False)


class InvoiceModel(Base):
    __tablename__ = "invoices"
    __table_args__ = (UniqueConstraint("ticket_id", name="uq_invoice_ticket"),)

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("maintenance_tickets.id"), nullable=False, unique=True)
    amount = Column(Numeric(10, 2), nullable=False)
    paid = Column(Boolean, nullable=False, default=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    paid_at = Column(DateTime(timezone=True), nullable=True)

    ticket = relationship("MaintenanceTicketModel", back_populates="invoice")
