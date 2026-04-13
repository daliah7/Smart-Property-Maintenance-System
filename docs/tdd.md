# TDD-Nachweis – Red-Green-Refactor

Dieses Dokument dokumentiert den Test-Driven Development-Prozess im Smart Property Maintenance System gemäss dem Modul „Agentic Software Architecture Coding" (Slides 25–27: Red-Green-Refactor).

---

## TDD-Philosophie im Projekt

> „Write the test first, make it pass, then clean it up."

Jede Business-Regel in SPMS wurde nach dem Red-Green-Refactor-Zyklus entwickelt:

1. **Red:** Test schreiben, der die gewünschte Business-Regel beschreibt — schlägt fehl, weil Implementierung fehlt
2. **Green:** Minimale Implementierung schreiben, die den Test zum Laufen bringt
3. **Refactor:** Code aufräumen, ohne dass Tests rot werden

Die Testsuite ist in drei Ebenen aufgeteilt (Testing Pyramid):
- `tests/unit/` — In-Memory-Repos, kein I/O, blitzschnell
- `tests/integration/` — SQLite in-memory, echter HTTP via FastAPI TestClient
- `frontend/e2e/` — Playwright, vollständiger Browser-Stack

---

## Beispiel 1: Ticket-Statusmaschine (Domain Layer)

### RED — Test schreiben

Datei: `tests/unit/test_domain.py`

```python
def test_ticket_invalid_transition():
    ticket = MaintenanceTicket(
        id=2, title="Test", description="Problem",
        unit_id=1, tenant_id=None, technician_id=None
    )
    with pytest.raises(InvalidStatusTransitionError):
        ticket.start()  # OPEN → IN_PROGRESS ist verboten
```

**Ergebnis:** `FAILED` — `InvalidStatusTransitionError` existiert noch nicht, `start()` fehlt.

```
E   AttributeError: 'MaintenanceTicket' object has no attribute 'start'
```

---

### GREEN — Minimale Implementierung

Datei: `backend/app/domain/models.py`

```python
ALLOWED_STATUS_TRANSITIONS = {
    TicketStatus.OPEN:        {TicketStatus.ASSIGNED},
    TicketStatus.ASSIGNED:    {TicketStatus.IN_PROGRESS},
    TicketStatus.IN_PROGRESS: {TicketStatus.RESOLVED},
    TicketStatus.RESOLVED:    {TicketStatus.CLOSED},
    TicketStatus.CLOSED:      set(),
}

@dataclass
class MaintenanceTicket:
    ...
    def _transition_status(self, new_status: TicketStatus) -> None:
        if new_status not in ALLOWED_STATUS_TRANSITIONS[self.status]:
            raise InvalidStatusTransitionError(
                f"Cannot transition from {self.status.value} to {new_status.value}"
            )
        self.status = new_status
        self.updated_at = datetime.utcnow()

    def start(self) -> None:
        self._transition_status(TicketStatus.IN_PROGRESS)
```

**Ergebnis:** `PASSED` — Test grün.

---

### REFACTOR — Alle Transitions vereinheitlichen

Gleicher Code `_transition_status()` wird von `assign()`, `start()`, `resolve()`, `close()` genutzt — kein Duplikat:

```python
def assign(self, technician_id: int) -> None:
    self._transition_status(TicketStatus.ASSIGNED)
    self.technician_id = technician_id

def start(self) -> None:
    self._transition_status(TicketStatus.IN_PROGRESS)

def resolve(self) -> None:
    self._transition_status(TicketStatus.RESOLVED)

def close(self) -> None:
    self._transition_status(TicketStatus.CLOSED)
```

Vollständiger Happy-Path-Test zur Absicherung:

```python
def test_ticket_domain_status_transitions():
    ticket = MaintenanceTicket(id=1, title="Test", ...)
    assert ticket.status == TicketStatus.OPEN

    ticket.assign(technician_id=2)
    assert ticket.status == TicketStatus.ASSIGNED

    ticket.start()
    assert ticket.status == TicketStatus.IN_PROGRESS

    ticket.resolve()
    assert ticket.status == TicketStatus.RESOLVED

    ticket.close()
    assert ticket.status == TicketStatus.CLOSED
```

---

## Beispiel 2: Duplikat-Rechnungsschutz (Application Layer)

### RED — Test schreiben

Datei: `tests/unit/test_application.py`

```python
def test_billing_service_prevents_duplicate_invoice(ticket_repo):
    ticket = ticket_repo.add(
        MaintenanceTicket(id=0, title="Fenster", description="Riss",
                          unit_id=1, tenant_id=None, technician_id=None)
    )
    ticket.assign(1); ticket.start(); ticket.resolve()

    invoice_repo = InMemoryInvoiceRepo()
    service = BillingService(ticket_repo, invoice_repo)
    service.create_invoice(ticket.id, Decimal("80.00"))

    with pytest.raises(BusinessRuleViolationError):
        service.create_invoice(ticket.id, Decimal("80.00"))  # Duplikat!
```

**Ergebnis:** `FAILED` — `BillingService.create_invoice()` existiert noch nicht.

```
E   AttributeError: 'BillingService' object has no attribute 'create_invoice'
```

---

### GREEN — Minimale Implementierung

Datei: `backend/app/application/services.py`

```python
class BillingService:
    def create_invoice(self, ticket_id: int, amount: Decimal) -> Invoice:
        ticket = self.ticket_repository.get(ticket_id)
        if not ticket.can_create_invoice():
            raise BusinessRuleViolationError(
                "Invoice can only be created for RESOLVED or CLOSED tickets."
            )
        existing = self.invoice_repository.get_by_ticket(ticket_id)
        if existing is not None:
            raise BusinessRuleViolationError(
                "An invoice already exists for this ticket."
            )
        invoice = Invoice(id=0, ticket_id=ticket_id, amount=amount)
        return self.invoice_repository.add(invoice)
```

**Ergebnis:** `PASSED`

---

### REFACTOR — Lesbarkeit und Konsistenz

Guard-Clauses statt verschachtelter if/else; `can_create_invoice()` als Domain-Methode statt Service-Level-Prüfung:

```python
# domain/models.py
def can_create_invoice(self) -> bool:
    return self.status in (TicketStatus.RESOLVED, TicketStatus.CLOSED)
```

Alle Validierungen sind jetzt an der richtigen Schicht:
- Domain-Constraint (Statusprüfung) → `MaintenanceTicket.can_create_invoice()`
- Business-Regel (kein Duplikat) → `BillingService.create_invoice()`

---

## Beispiel 3: Idempotenz-Schutz bei Rechnungsbezahlung

### RED

```python
def test_pay_already_paid_invoice_raises_error(ticket_repo):
    ticket = ticket_repo.add(
        MaintenanceTicket(id=0, title="Schloss", description="Klemmt",
                          unit_id=1, tenant_id=None, technician_id=None)
    )
    ticket.assign(1); ticket.start(); ticket.resolve()

    invoice_repo = InMemoryInvoiceRepo()
    service = BillingService(ticket_repo, invoice_repo)
    invoice = service.create_invoice(ticket.id, Decimal("60.00"))
    service.pay_invoice(invoice.id)

    with pytest.raises(BusinessRuleViolationError):
        service.pay_invoice(invoice.id)  # Bereits bezahlt!
```

**FAILED:** `pay_invoice` existiert noch nicht.

### GREEN

Schrittweise in `Invoice.mark_paid()` (Domain) und `BillingService.pay_invoice()` (Application):

```python
# domain/models.py
def mark_paid(self) -> None:
    if self.paid:
        raise BusinessRuleViolationError("Invoice is already paid.")
    self.paid = True
    self.paid_at = datetime.utcnow()

# application/services.py
def pay_invoice(self, invoice_id: int) -> Invoice:
    invoice = self.invoice_repository.get(invoice_id)
    invoice.mark_paid()
    return self.invoice_repository.update(invoice)  # update(), nicht add()!
```

**PASSED**

### REFACTOR — Bug behoben

Initial wurde `self.invoice_repository.add(invoice)` aufgerufen (AI-generierter Code-Bug).
Nach Analyse: `add()` hätte einen doppelten Eintrag erzeugt. Korrekt ist `update()`.
Gleichzeitig wurde `update()` dem `InvoiceRepository`-Protocol hinzugefügt, das initial fehlte.

---

## Beispiel 4: Mieter-Einheit-Konsistenz (Integrations-TDD)

### RED — Integrationstest

Datei: `tests/integration/test_api.py`

```python
def test_invalid_status_transition_returns_422(client):
    # Setup: Property → Unit → Ticket anlegen
    prop = client.post("/api/v1/properties/", json={"name": "Haus A", "address": "Hauptstr. 1"}).json()
    unit = client.post("/api/v1/units/", json={"property_id": prop["id"], "name": "EG", "floor": "0"}).json()
    ticket = client.post("/api/v1/tickets/", json={
        "title": "Rohr defekt", "description": "Wasser läuft",
        "unit_id": unit["id"]
    }).json()

    # OPEN → IN_PROGRESS überspringt ASSIGNED — muss 422 zurückgeben
    response = client.patch(f"/api/v1/tickets/{ticket['id']}/start")
    assert response.status_code == 422
```

**FAILED:** Endpoint gab `500 Internal Server Error` zurück, weil `InvalidStatusTransitionError` nicht abgefangen war.

### GREEN — Exception-Handler ergänzt

Datei: `backend/app/api/v1/tickets.py`

```python
@router.patch("/{ticket_id}/start", response_model=TicketRead)
def start_ticket(ticket_id: int, session: Session = Depends(get_session)):
    ...
    try:
        ticket = service.start_ticket(ticket_id)
        return _ticket_response(ticket)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except InvalidStatusTransitionError as exc:        # NEU
        raise HTTPException(status_code=422, detail=str(exc))
    except BusinessRuleViolationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
```

**PASSED** — 500 → 422 ✅

### REFACTOR

Gleiches Muster auf alle Transition-Endpoints (`assign`, `start`, `resolve`, `close`) ausgerollt.

---

## Test-Coverage-Übersicht

```
tests/unit/test_domain.py
  ✅ test_ticket_domain_status_transitions      (Happy Path: alle Übergänge)
  ✅ test_ticket_invalid_transition             (Red: OPEN → IN_PROGRESS verboten)
  ✅ test_invoice_only_after_resolved_ticket    (Red: Invoice vor RESOLVED verboten)
  ✅ test_invoice_mark_paid                     (Idempotenz: bereits bezahlt)

tests/unit/test_application.py
  ✅ test_ticket_lifecycle_service_*            (Service Happy Path)
  ✅ test_billing_service_rejects_invoice_*     (Vor RESOLVED verboten)
  ✅ test_billing_service_creates_and_pays_*    (Vollständiger Billing-Flow)
  ✅ test_invalid_status_transition_raises_*    (Service-Ebene: falscher Übergang)
  ✅ test_billing_service_prevents_duplicate_*  (Duplikat-Schutz)
  ✅ test_pay_already_paid_invoice_*            (Idempotenz-Schutz)
  ✅ test_create_ticket_rejects_tenant_unit_*   (Konsistenz-Prüfung)

tests/integration/test_api.py
  ✅ test_full_ticket_lifecycle                 (E2E HTTP: OPEN→CLOSED→Invoice)
  ✅ test_invalid_status_transition_returns_422 (HTTP 422 bei falschem Übergang)
  ✅ test_duplicate_invoice_returns_400         (HTTP 400 bei Duplikat-Invoice)
  ✅ test_ticket_not_found_returns_404          (HTTP 404 bei fehlendem Ticket)
```

**Testpyramide:**
```
         [E2E Playwright]
           (wenige, langsam)
        [Integration: TestClient]
          (mittel, SQLite)
    [Unit: In-Memory-Repos]
      (viele, blitzschnell)
```

---

## TDD und AI-Assistenz

### Wie TDD und AI-Tools zusammenwirken

1. **Tests als Spezifikation:** Bevor Claude Code aufgerufen wurde, wurde der gewünschte Test manuell formuliert. Dieser Test diente als präzise Spezifikation des erwarteten Verhaltens.

2. **AI generiert Implementierung:** Mit dem Test als Vorgabe wurde Claude Code mit einem Prompt wie *"Implementiere BillingService.create_invoice() so, dass folgender Test besteht: [Test-Code]"* aufgerufen.

3. **Menschliche Verifikation:** Das Ergebnis wurde auf Korrektheit geprüft — insbesondere ob `add()` vs. `update()` korrekt verwendet wird und ob alle Fehlerpfade behandelt sind.

4. **Refactoring unter Test-Schutz:** Nach dem Green-Schritt wurde refaktoriert (z.B. Abstraktion der `_transition_status()`-Methode), wobei die Tests als Sicherheitsnetz dienten.

### AI-generierte Bugs, die TDD aufgedeckt hat

| Bug | Entdeckt durch | Schweregrad |
|---|---|---|
| `pay_invoice()` rief `add()` statt `update()` auf (Duplikat-Eintrag) | `test_pay_already_paid_invoice_raises_error` | Hoch |
| `InvalidStatusTransitionError` nicht in API gefangen → HTTP 500 | `test_invalid_status_transition_returns_422` | Mittel |
| `update()` fehlte im `InvoiceRepository` Protocol | Statischer Typ-Check (mypy) | Mittel |

### Fazit

TDD hat in diesem Projekt sichergestellt, dass AI-generierter Code korrekt funktioniert. Die Tests definierten das erwartete Verhalten präzise — und deckten in zwei Fällen echte Bugs im generierten Code auf, die ohne Tests unentdeckt geblieben wären.
