# Scrum-Dokumentation – Smart Property Maintenance System

Dieses Dokument dokumentiert die agile Projektdurchführung nach Scrum gemäss dem Modul „Scrum, SAFe und AI Assisted SDLC".

---

## Projektrahmendaten

| | |
|---|---|
| **Team** | 1 Entwickler (Solo-Projekt / Capstone) |
| **Sprint-Länge** | 1 Woche |
| **Anzahl Sprints** | 3 |
| **Gesamtdauer** | 3 Wochen |
| **AI-Unterstützung** | Claude Code (Primär), GitHub Copilot (Inline) |

---

## Product Backlog

Der Product Backlog enthält alle User Stories, priorisiert nach Geschäftswert (MoSCoW).

### Priorisierung: Must Have

| ID | User Story | Story Points | Akzeptanzkriterien |
|---|---|---|---|
| US-01 | Als Verwalter möchte ich eine Property anlegen, damit ich Einheiten zuordnen kann. | 2 | POST /properties gibt 201; Name/Adresse validiert (min/max Länge) |
| US-02 | Als Verwalter möchte ich Einheiten (Units) einer Property zuordnen, um Tickets zu lokalisieren. | 2 | POST /units gibt 201; unit_id in Ticket-Create vorhanden |
| US-03 | Als Verwalter möchte ich einen Mieter erfassen, damit er einem Ticket zugeordnet werden kann. | 2 | POST /tenants gibt 201; E-Mail-Validierung aktiv |
| US-04 | Als Verwalter möchte ich einen Techniker erfassen mit Fachgebiet. | 2 | POST /technicians gibt 201 |
| US-05 | Als Verwalter möchte ich ein Instandhaltungsticket eröffnen (Titel, Beschreibung, Einheit, Mieter). | 3 | POST /tickets gibt 201; Status = OPEN; created_at gesetzt |
| US-06 | Als Verwalter möchte ich einen Techniker einem Ticket zuweisen. | 3 | PATCH /tickets/{id}/assign gibt 200; Status wechselt zu ASSIGNED |
| US-07 | Als Techniker möchte ich ein Ticket als „In Bearbeitung" markieren. | 2 | PATCH /tickets/{id}/start gibt 200; Status = IN_PROGRESS |
| US-08 | Als Techniker möchte ich ein Ticket als „Gelöst" markieren. | 2 | PATCH /tickets/{id}/resolve gibt 200; Status = RESOLVED |
| US-09 | Als Verwalter möchte ich ein Ticket schliessen. | 1 | PATCH /tickets/{id}/close gibt 200; Status = CLOSED |
| US-10 | Als Verwalter möchte ich eine Rechnung zu einem abgeschlossenen Ticket erstellen. | 3 | POST /tickets/{id}/invoice gibt 201; nur bei RESOLVED/CLOSED möglich |
| US-11 | Als Verwalter möchte ich eine Rechnung als bezahlt markieren. | 2 | PATCH /invoices/{id}/pay gibt 200; paid=true, paid_at gesetzt |

### Priorisierung: Should Have

| ID | User Story | Story Points | Akzeptanzkriterien |
|---|---|---|---|
| US-12 | Als Verwalter möchte ich alle Tickets nach Status filtern. | 2 | GET /tickets?status=OPEN gibt nur OPEN-Tickets zurück |
| US-13 | Als Benutzer möchte ich ein interaktives Frontend mit Ticket-Formular und -Liste. | 5 | React-App startet; Ticket anlegen und Status-Übergänge auslösbar |
| US-14 | Als Entwickler möchte ich automatisierte Tests die bei jedem Push laufen. | 3 | GitHub Actions CI: Unit + Integration Tests grün |

### Priorisierung: Could Have

| ID | User Story | Story Points | Akzeptanzkriterien |
|---|---|---|---|
| US-15 | Als Benutzer möchte ich die App in Docker betreiben können. | 3 | `docker-compose up` startet Backend + Frontend + DB |
| US-16 | Als Entwickler möchte ich automatische Deployments bei Git-Tag. | 2 | release.yml erzeugt GitHub Release + Docker Image |
| US-17 | Als Verwalter möchte ich E2E-Tests für kritische Flows. | 3 | Playwright: Ticket anlegen → zuweisen → schliessen → Rechnung |

### Priorisierung: Won't Have (this release)

| ID | User Story | Begründung |
|---|---|---|
| US-18 | Benutzerauthentifizierung / Login | Scope zu gross für Capstone, kein Req. laut Aufgabenstellung |
| US-19 | E-Mail-Benachrichtigungen | Externe Service-Integration ausserhalb Projektscope |
| US-20 | Mobile App | Separates Projekt |

---

## Sprint-Planung

### Sprint 1 – Domäne und Backend-Kern (Woche 1)

**Sprint Goal:** Das Backend-Kernmodell ist implementiert und vollständig getestet. Alle Ticket-Lifecycle-Übergänge funktionieren korrekt.

**Sprint Backlog:**

| Story | Task | Status |
|---|---|---|
| US-01 | Domain-Modell: Property, Unit, Tenant, Technician, Ticket, Invoice als Dataclasses | ✅ Done |
| US-01 | Repository-Interfaces als Python Protocol | ✅ Done |
| US-05 | TicketLifecycleService: create_ticket() | ✅ Done |
| US-06 | TicketLifecycleService: assign_ticket() | ✅ Done |
| US-07 | TicketLifecycleService: start_ticket() | ✅ Done |
| US-08 | TicketLifecycleService: resolve_ticket() | ✅ Done |
| US-09 | TicketLifecycleService: close_ticket() | ✅ Done |
| US-10 | BillingService: create_invoice() mit Duplikat-Schutz | ✅ Done |
| US-11 | BillingService: pay_invoice() mit Idempotenz-Schutz | ✅ Done |
| US-14 | Unit-Tests für alle Services (In-Memory-Repos) | ✅ Done |

**Sprint Review:** Statusmaschine vollständig implementiert. Alle 11 Unit-Tests grün. Bug identifiziert: `update()` fehlte im InvoiceRepository — behoben.

**Sprint Retrospektive:**
- Was lief gut: Clean Architecture hielt Testbarkeit hoch; AI-generierte Struktur war solid
- Was verbessern: Exception-Handling in API-Layer von Anfang an mitdenken

---

### Sprint 2 – API-Layer, Integration, Infrastruktur (Woche 2)

**Sprint Goal:** FastAPI-Endpoints sind vollständig implementiert, integrationstested und lokal lauffähig. Datenbankmigrationen funktionieren.

**Sprint Backlog:**

| Story | Task | Status |
|---|---|---|
| US-01–US-11 | FastAPI-Router für alle Entities | ✅ Done |
| US-01–US-11 | Pydantic-Schemas mit Validierung (Field, EmailStr, Decimal) | ✅ Done |
| US-01–US-11 | SQLAlchemy-Repository-Implementierungen | ✅ Done |
| US-01–US-11 | Alembic-Migrationen | ✅ Done |
| US-01–US-11 | HTTP-Fehler-Mapping: 404 / 400 / 422 in allen Endpoints | ✅ Done |
| US-12 | GET /tickets?status=… Filterlogik | ✅ Done |
| US-14 | Integrationstests (SQLite in-memory, FastAPI TestClient) | ✅ Done |
| – | CORS-Middleware konfiguriert (cors_origins via Settings) | ✅ Done |
| – | Demo-Daten Seeder (seed_demo_data) | ✅ Done |

**Sprint Review:** Backend vollständig funktionsfähig. 3 neue Integrationstests ergänzt (422-Transitions, Duplikat-Invoice, 404-Not-Found). CORS-Bug behoben (Frontend-Dropdown funktioniert).

**Sprint Retrospektive:**
- Was lief gut: Repository-Pattern erleichterte den Wechsel zwischen SQLite (Test) und PostgreSQL (Prod) erheblich
- Was verbessern: CORS früher konfigurieren, nicht erst wenn Frontend läuft

---

### Sprint 3 – Frontend, CI/CD, Deployment (Woche 3)

**Sprint Goal:** Vollständige End-to-End-Lösung: React-Frontend bedienbar, CI/CD grün, Docker-Build funktioniert, Deployment auf Render.com konfiguriert.

**Sprint Backlog:**

| Story | Task | Status |
|---|---|---|
| US-13 | React + TypeScript + Vite Setup | ✅ Done |
| US-13 | api.ts: alle fetch()-Calls für alle Endpoints | ✅ Done |
| US-13 | Komponenten: TicketList, TicketForm, TicketDetail | ✅ Done |
| US-13 | „Rechnung bezahlen"-Button in TicketDetail | ✅ Done |
| US-14 | GitHub Actions CI: parallel Backend + Frontend Jobs | ✅ Done |
| US-14 | mypy + tsc --noEmit in CI | ✅ Done |
| US-15 | Dockerfile (Backend multi-stage, Frontend Nginx) | ✅ Done |
| US-15 | docker-compose.yml mit PostgreSQL | ✅ Done |
| US-16 | release.yml: GitHub Release + Docker Image bei v*-Tag | ✅ Done |
| US-17 | Playwright E2E-Tests (kritische Flows) | ✅ Done |
| – | render.yaml für Render.com-Deployment | ✅ Done |
| – | Dokumentation: architecture.md, AGENTS.md, scrum.md, tdd.md | ✅ Done |

**Sprint Review:** Vollständige Lösung lauffähig. E2E-Tests decken Happy Path ab. CI/CD Pipeline grün.

**Sprint Retrospektive:**
- Was lief gut: Docker-Compose erleichterte lokales Setup; render.yaml macht Deployment reproduzierbar
- Was verbessern: index.html-Pfad für Vite (in root, nicht in public/) früher klären

---

## Definition of Done (DoD)

Eine User Story gilt als **Done**, wenn alle folgenden Kriterien erfüllt sind:

### Code-Qualität
- [ ] Code ist committed und auf `main`-Branch
- [ ] Kein Linting-Fehler (ruff check / tsc --noEmit meldet 0 Errors)
- [ ] Keine Typsicherheits-Fehler (mypy app meldet 0 Errors)
- [ ] Code-Review / Self-Review durchgeführt

### Tests
- [ ] Unit-Tests für neue Business-Logik vorhanden und grün
- [ ] Integrationstests für neue API-Endpoints vorhanden und grün
- [ ] Negativfälle (Fehlerbehandlung) getestet
- [ ] `pytest --cov=app` zeigt Coverage ≥ 80% für neuen Code

### Dokumentation
- [ ] API-Endpunkt in README oder OpenAPI-Doku beschrieben
- [ ] Architektur-relevante Entscheidungen in `docs/architecture.md` festgehalten
- [ ] AI-Einsatz dokumentiert in `AGENTS.md` (wenn AI genutzt wurde)

### Funktionalität
- [ ] Feature manuell im Browser getestet (Frontend-Features)
- [ ] Kein Regression in bestehenden Tests
- [ ] CI/CD Pipeline grün (GitHub Actions)

---

## Velocity-Übersicht

| Sprint | Geplante SP | Erledigte SP | Velocity |
|---|---|---|---|
| Sprint 1 | 22 | 22 | 22 |
| Sprint 2 | 24 | 24 | 24 |
| Sprint 3 | 28 | 28 | 28 |
| **Gesamt** | **74** | **74** | **Ø 24,7** |

---

## AI-Unterstützung im Scrum-Prozess

### Wie AI die Scrum-Zeremonien unterstützt hat

**Sprint Planning:** Claude Code hat auf Basis der User Stories technische Tasks aufgelistet und geschätzte Komplexitäten eingeschätzt — hilfreiche Zweitmeinung, finale Entscheidung durch Entwickler.

**Daily Standup (Solo-Format):** Vor jeder Session: Kurze Überprüfung des aktuellen Fortschritts mit Claude Code als „Spiegel" — Was wurde gestern erledigt? Was ist heute geplant? Gibt es Blocker?

**Sprint Review:** AI hat geholfen, Demo-Flows zu strukturieren und Präsentationsnotizen zu erstellen (`docs/presentation-notes.md`).

**Sprint Retrospektive:** Claude Code hat Codebase analysiert und Muster in AI-generierten vs. manuell korrigierten Code identifiziert — Input für Retro.

### SAFe-Bezug

In einem grösseren Team würde SPMS als **Feature** im Program Increment (PI) geplant:
- **Epic:** Digitale Instandhaltungsverwaltung
- **Feature:** Ticket-Lifecycle mit Rechnungsstellung
- **User Stories:** US-01 bis US-17 (siehe oben)

Die saubere Schichtenarchitektur ermöglicht parallele Team-Arbeit: Frontend-Team und Backend-Team können unabhängig über die definierten API-Interfaces arbeiten.
