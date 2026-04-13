from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.infrastructure.database import get_session
from app.infrastructure.models import Base
from app.main import app


engine = create_engine(
    "sqlite+pysqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    future=True,
)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, future=True)
Base.metadata.create_all(bind=engine)


def override_get_session():
    session = TestingSessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


app.dependency_overrides[get_session] = override_get_session


client = TestClient(app)


def test_create_ticket_and_progress_flow():
    api_base = "/api"

    response = client.post(f"{api_base}/properties/", json={"name": "Test Objekt", "address": "Teststraße 1"})
    assert response.status_code == 201

    property_id = response.json()["id"]
    response = client.post(f"{api_base}/units/", json={"property_id": property_id, "name": "T1", "floor": "EG"})
    assert response.status_code == 201

    unit_id = response.json()["id"]
    response = client.post(
        f"{api_base}/tenants/", json={"name": "Lena", "email": "lena@example.com", "unit_id": unit_id}
    )
    assert response.status_code == 201
    tenant_id = response.json()["id"]

    response = client.post(f"{api_base}/technicians/", json={"name": "Jan", "expertise": "Sanitär"})
    assert response.status_code == 201
    technician_id = response.json()["id"]

    response = client.post(
        f"{api_base}/tickets/",
        json={
            "title": "Wasserrohrbruch",
            "description": "Küche und Bad sind dunkel.",
            "unit_id": unit_id,
            "tenant_id": tenant_id,
        },
    )
    assert response.status_code == 201
    ticket = response.json()
    assert ticket["status"] == "OPEN"

    ticket_id = ticket["id"]
    assign_response = client.patch(f"{api_base}/tickets/{ticket_id}/assign", json={"technician_id": technician_id})
    assert assign_response.status_code == 200
    assert assign_response.json()["status"] == "ASSIGNED"

    start_response = client.patch(f"{api_base}/tickets/{ticket_id}/start")
    assert start_response.status_code == 200
    assert start_response.json()["status"] == "IN_PROGRESS"

    resolve_response = client.patch(f"{api_base}/tickets/{ticket_id}/resolve")
    assert resolve_response.status_code == 200
    assert resolve_response.json()["status"] == "RESOLVED"

    invoice_response = client.post(f"{api_base}/tickets/{ticket_id}/invoice", json={"amount": 150.0})
    assert invoice_response.status_code == 201
    assert invoice_response.json()["ticket_id"] == ticket_id

    invoice_by_ticket = client.get(f"{api_base}/tickets/{ticket_id}/invoice")
    assert invoice_by_ticket.status_code == 200
    assert invoice_by_ticket.json()["ticket_id"] == ticket_id

    resolved_list = client.get(f"{api_base}/tickets/?status=RESOLVED")
    assert resolved_list.status_code == 200
    assert any(ticket_data["status"] == "RESOLVED" for ticket_data in resolved_list.json())

    close_response = client.patch(f"{api_base}/tickets/{ticket_id}/close")
    assert close_response.status_code == 200
    assert close_response.json()["status"] == "CLOSED"


def test_invalid_status_transition_returns_422():
    api_base = "/api"

    response = client.post(f"{api_base}/properties/", json={"name": "Objekt B", "address": "Musterweg 5"})
    property_id = response.json()["id"]
    response = client.post(f"{api_base}/units/", json={"property_id": property_id, "name": "U1", "floor": "1"})
    unit_id = response.json()["id"]

    response = client.post(
        f"{api_base}/tickets/",
        json={"title": "Defekte Leuchte", "description": "Flur dunkel", "unit_id": unit_id},
    )
    assert response.status_code == 201
    ticket_id = response.json()["id"]

    # Versuch: OPEN → IN_PROGRESS (Schritt überspringen)
    start_response = client.patch(f"{api_base}/tickets/{ticket_id}/start")
    assert start_response.status_code == 422


def test_duplicate_invoice_returns_400():
    api_base = "/api"

    response = client.post(f"{api_base}/properties/", json={"name": "Objekt C", "address": "Parkweg 3"})
    property_id = response.json()["id"]
    response = client.post(f"{api_base}/units/", json={"property_id": property_id, "name": "U2", "floor": "EG"})
    unit_id = response.json()["id"]
    response = client.post(f"{api_base}/technicians/", json={"name": "Ali", "expertise": "Elektrik"})
    technician_id = response.json()["id"]

    response = client.post(
        f"{api_base}/tickets/",
        json={"title": "Steckdose defekt", "description": "Kein Strom", "unit_id": unit_id},
    )
    ticket_id = response.json()["id"]

    client.patch(f"{api_base}/tickets/{ticket_id}/assign", json={"technician_id": technician_id})
    client.patch(f"{api_base}/tickets/{ticket_id}/start")
    client.patch(f"{api_base}/tickets/{ticket_id}/resolve")

    r1 = client.post(f"{api_base}/tickets/{ticket_id}/invoice", json={"amount": 90.0})
    assert r1.status_code == 201

    r2 = client.post(f"{api_base}/tickets/{ticket_id}/invoice", json={"amount": 90.0})
    assert r2.status_code == 400


def test_ticket_not_found_returns_404():
    response = client.get("/api/tickets/99999")
    assert response.status_code == 404
