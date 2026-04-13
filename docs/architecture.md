# Architekturübersicht

## Systemdiagramm

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser / Client                      │
│                  React + TypeScript (Vite)                   │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP / JSON
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  FastAPI (REST API)                          │
│   api/v1/tickets  api/v1/invoices  api/v1/properties ...    │
│   – HTTP-Fehler-Mapping (404 / 400 / 422)                   │
└──────────────────────────┬──────────────────────────────────┘
                           │ ruft auf
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Application Layer (Use-Case-Services)           │
│   TicketLifecycleService        BillingService               │
│   – Orchestrierung, Validierung, Repository-Aufrufe         │
└──────┬────────────────────────────────────┬─────────────────┘
       │ arbeitet mit                        │ arbeitet mit
       ▼                                     ▼
┌──────────────────────┐        ┌────────────────────────────┐
│   Domain Layer       │        │   Repository Protocols      │
│   MaintenanceTicket  │        │   (app.application.repos)   │
│   Invoice            │        │   – Protocol-Interfaces     │
│   Statusmaschine     │        │   – keine ORM-Abhängigkeit  │
│   Business-Regeln    │        └──────────────┬─────────────┘
└──────────────────────┘                       │ implementiert durch
                                               ▼
                              ┌────────────────────────────────┐
                              │   Infrastructure Layer          │
                              │   SqlAlchemy-Repositories       │
                              │   ORM-Modelle (models.py)       │
                              │   Alembic-Migrationen           │
                              └──────────────┬─────────────────┘
                                             │
                                             ▼
                              ┌────────────────────────────────┐
                              │   PostgreSQL (Prod)             │
                              │   SQLite (Lokal / Tests)        │
                              └────────────────────────────────┘
```

## Schichtenmodell

| Schicht | Paket | Abhängigkeiten |
|---|---|---|
| API / Interface | `app.api.v1` | Application, Domain |
| Application | `app.application` | Domain |
| Domain | `app.domain` | keine |
| Infrastructure | `app.infrastructure` | Application (Protocols), Domain |

## Ticket-Statusmaschine

```
  ┌──────┐    assign()    ┌──────────┐   start()   ┌─────────────┐
  │ OPEN │ ─────────────► │ ASSIGNED │ ──────────► │ IN_PROGRESS │
  └──────┘                └──────────┘             └──────┬──────┘
                                                          │ resolve()
                                                          ▼
                                              ┌───────────────────┐
                                              │     RESOLVED      │◄─── Invoice möglich
                                              └─────────┬─────────┘
                                                        │ close()
                                                        ▼
                                              ┌───────────────────┐
                                              │      CLOSED       │
                                              └───────────────────┘
```

Ungültige Übergänge (z.B. OPEN → IN_PROGRESS) werfen `InvalidStatusTransitionError` → HTTP 422.

## Entitäten und Geschäftslogik

### Kernentitäten

- `Property` – Immobilie mit Adresse
- `Unit` – Wohneinheit innerhalb einer Property
- `Tenant` – Mieter, fest einer Unit zugeordnet
- `Technician` – Handwerker mit Fachgebiet und Expertise-String
- `MaintenanceTicket` – zentrales Aggregate mit Statusmaschine und `priority`-Feld
- `Invoice` – Rechnung, genau eine pro RESOLVED-Ticket

### Business-Regeln (enforced im Domain-Layer)

1. Tenant muss in der Ticket-Unit registriert sein (`create_ticket`)
2. Invoice nur für RESOLVED-Tickets erstellbar (`can_create_invoice`)
3. Pro Ticket maximal eine Invoice (`BillingService.create_invoice`)
4. Invoice kann nur einmal bezahlt werden (`Invoice.mark_paid`)
5. Auto-Assign nur für OPEN-Tickets (`auto_assign_ticket`)
6. Mindestens ein Techniker muss vorhanden sein für Auto-Assign

## Architekturentscheidungen (ADR)

### ADR-001: Repository Pattern mit Protocol-Interfaces

**Entscheidung:** Repository-Interfaces als Python `Protocol` definiert, nicht als abstrakte Basisklassen.

**Begründung:** Ermöglicht In-Memory-Implementierungen in Unit-Tests ohne jede ORM-Abhängigkeit. Tests laufen ohne Datenbank und ohne Mock-Framework.

**Konsequenz:** Unit-Tests testen echte Business-Logik gegen echte In-Memory-Repos; Integrationstests validieren die SQL-Implementierung separat.

---

### ADR-002: Domain-Objekte als Dataclasses (nicht als ORM-Modelle)

**Entscheidung:** `MaintenanceTicket`, `Invoice` etc. sind reine Python-Dataclasses im `app.domain`-Paket. ORM-Modelle in `app.infrastructure` sind davon getrennt.

**Begründung:** Framework-Unabhängigkeit. Statusübergänge und Business-Regeln sind testbar ohne SQLAlchemy-Session.

**Konsequenz:** Mapping-Funktionen (`_ticket_from_model`) übersetzen zwischen ORM- und Domain-Objekten.

---

### ADR-003: Statusübergänge im Domain-Objekt, nicht im Service

**Entscheidung:** `MaintenanceTicket.assign()`, `.start()`, `.resolve()`, `.close()` validieren und führen Übergänge selbst durch.

**Begründung:** Das Ticket ist das Aggregate und kennt seine eigenen Regeln. Services orchestrieren nur – sie validieren keine Statuslogik.

**Konsequenz:** `InvalidStatusTransitionError` wird im Domain-Layer geworfen und auf HTTP 422 gemappt.

---

### ADR-004: SQLite für Tests, PostgreSQL für Produktion

**Entscheidung:** Integrationstests nutzen SQLite in-memory, Produktion zielt auf PostgreSQL.

**Begründung:** SQLite-Tests sind schnell, reproduzierbar und benötigen keinen laufenden DB-Container in CI.

**Konsequenz:** CI läuft ohne Docker-Dependency. `render.yaml` konfiguriert PostgreSQL für Produktion.

---

### ADR-005: Regelbasierte Prioritätsinferenz im Domain-Layer

**Entscheidung:** `infer_priority(title, description)` ist eine reine Funktion im `app.domain.enums`-Modul — keine Abhängigkeit zu Services oder Infrastructure.

**Begründung:** Prioritätslogik ist eine Geschäftsregel, keine technische Infrastruktur. Im Domain-Layer ist sie testbar ohne HTTP-Stack, ohne DB, ohne Mock — ein einzelner `pytest`-Aufruf genügt.

**Konsequenz:** `create_ticket()` im Application-Layer ruft `infer_priority()` auf, falls der Client keine explizite Priorität mitgibt. Der Client kann die Priorität übersteuern (manuell gewählte Priorität wird direkt übernommen).

---

### ADR-006: Keyword-Scoring für automatische Techniker-Zuweisung

**Entscheidung:** `auto_assign_ticket()` im Application-Layer verwendet einen Scoring-Algorithmus: Techniker erhalten Punkte basierend auf Überschneidungen zwischen Ticket-Keywords und ihrem `expertise`-Feld.

**Begründung:** Eine ML-Lösung (NLP-Modell) wäre für den Use Case überengineered und würde externe Dependencies und Latenz einführen. Der regelbasierte Ansatz ist deterministisch, testbar, und ausreichend präzise für die Domäne.

**Konsequenz:** Tests können genau spezifizieren, welcher Techniker bei welchem Ticket-Text ausgewählt wird — kein stochastisches Verhalten. Erweiterung auf NLP möglich ohne API-Änderung.

---

## Warum dieser Stack?

- **Python 3.12 + FastAPI**: Leichtgewichtig, nativ async-fähig, exzellente OpenAPI-Unterstützung
- **SQLAlchemy 2**: Modernes ORM mit explizitem Session-Management und klarer Trennung
- **React + TypeScript**: Typsichere UI, einfache Erweiterbarkeit, kein Overengineering
- **Pytest + Playwright**: Vollständige Testpyramide – Unit, Integration, E2E
- **Docker + docker-compose**: Reproduzierbare Entwicklungsumgebung, deployment-ready
