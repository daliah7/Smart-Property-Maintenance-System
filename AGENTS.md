# AGENTS.md – AI-Assisted Development

Dieses Dokument beschreibt, wie AI-Coding-Agenten in diesem Projekt eingesetzt wurden.
Es folgt der WHY / WHAT / HOW-Struktur gemäss Vorlesungsfolien „Agentic Software Architecture Coding".

---

## WHY – Projektzweck und Kontext

**Projektzweck:**
Smart Property Maintenance System (SPMS) ist eine webbasierte Plattform zur digitalen Verwaltung von Instandhaltungstickets für Mietimmobilien. Verwalter eröffnen Tickets, weisen Techniker zu und verfolgen den gesamten Lebenszyklus von OPEN bis CLOSED – inklusive automatischer Rechnungsstellung.

**Kontext für den AI-Agenten:**
- Architektur: Clean Architecture (Domain → Application → Infrastructure / API)
- Domain-Objekte sind Python-Dataclasses ohne Framework-Abhängigkeiten
- Repository-Interfaces als Python `Protocol` — testbar ohne Mocks
- Backend: FastAPI + SQLAlchemy 2 + Alembic; Frontend: React + TypeScript + Vite
- Tests: Unit (In-Memory-Repos), Integration (SQLite in-memory), E2E (Playwright)
- CI/CD: GitHub Actions → Docker → Render.com

**Warum AI-Assistenz?**
Schichtenarchitektur und Repository-Pattern erzeugen viel strukturellen Boilerplate-Code, der AI-gestützt effizient erzeugt, dann manuell auf Korrektheit geprüft und angepasst wird.

---

## WHAT – Tech-Stack, Architektur, File-Structure

**Tech-Stack:**

| Schicht | Technologie |
|---|---|
| Backend API | FastAPI 0.109+, Python 3.12 |
| ORM / Migrationen | SQLAlchemy 2, Alembic |
| Datenbank | PostgreSQL (Prod), SQLite (Dev/Test) |
| Validierung | Pydantic v2 mit `EmailStr`, `Decimal`, `Field` |
| Frontend | React 18, TypeScript, Vite |
| Containerisierung | Docker, docker-compose |
| CI/CD | GitHub Actions (parallel Backend + Frontend Jobs) |
| Deployment | Render.com via `render.yaml` |
| Linting/Typen | ruff, black, mypy (Backend), tsc (Frontend) |

**Verzeichnisstruktur:**

```
Smart-Property-Maintenance-System/
├── backend/
│   ├── app/
│   │   ├── domain/          # Entities, Enums, Exceptions (keine Framework-Abhängigkeiten)
│   │   ├── application/     # Services, Repository-Interfaces (Protocol), Schemas
│   │   ├── api/v1/          # FastAPI-Router (HTTP-Adapter)
│   │   └── infrastructure/  # SQLAlchemy-Repos, DB-Setup, Seeder
│   └── tests/
│       ├── unit/            # In-Memory-Repos, kein I/O
│       └── integration/     # SQLite in-memory, echter HTTP via TestClient
├── frontend/
│   ├── src/
│   │   ├── api.ts           # Alle fetch()-Aufrufe zentralisiert
│   │   ├── App.tsx          # State-Management, Event-Handler
│   │   └── components/      # TicketDetail, TicketForm, TicketList, …
│   └── e2e/                 # Playwright-Tests
├── docs/
│   ├── architecture.md      # Schichtendiagramm, ADRs
│   ├── scrum.md             # Product Backlog, Sprints, DoD
│   └── tdd.md               # Red-Green-Refactor-Nachweis
├── .github/workflows/       # ci.yml, release.yml
├── docker-compose.yml
├── render.yaml
└── AGENTS.md                # dieses Dokument
```

---

## HOW – Build-Commands, Test-Commands, Workflow-Regeln

**Backend starten (lokal):**
```bash
cd backend
pip install -r requirements.txt
PYTHONPATH=. uvicorn app.main:app --reload
# SQLite-Dev-DB wird automatisch angelegt und mit Demo-Daten befüllt
```

**Frontend starten:**
```bash
cd frontend
npm install
npm run dev
# Vite-Dev-Server auf http://localhost:5173
```

**Tests ausführen:**
```bash
# Unit-Tests (keine DB, kein Netz)
cd backend && pytest tests/unit -v

# Integrationstests (SQLite in-memory)
cd backend && pytest tests/integration -v

# Coverage-Report
cd backend && pytest --cov=app --cov-report=term-missing

# E2E (Backend + Frontend müssen laufen)
cd frontend && npx playwright test
```

**Linting & Typprüfung:**
```bash
cd backend
ruff check app tests
mypy app

cd frontend
npx tsc --noEmit
```

**Docker-Build:**
```bash
docker-compose up --build
# Backend: http://localhost:8000, Frontend: http://localhost:80
```

**Workflow-Regeln für den AI-Agenten:**
1. Änderungen an Domain-Objekten (`app/domain/`) dürfen keine neuen Framework-Imports einführen.
2. Repository-Interfaces (`app/application/repositories.py`) sind die einzige Abstraktion zwischen Application- und Infrastructure-Layer — nie direkte SQLAlchemy-Queries in Services.
3. Neue Endpunkte immer mit: Schema-Klasse, Service-Methode, HTTP-Fehler-Mapping (404/400/422) und Integrationstest.
4. Statusübergänge ausschliesslich über `MaintenanceTicket._transition_status()` — nie Status direkt setzen.
5. Jede neue Business-Regel erst als Unittest schreiben (Red), dann implementieren (Green), dann ggf. refaktorisieren.

---

## LLM-Auswahl und Begründung

### Evaluierte Optionen

| Tool | Stärken | Schwächen |
|---|---|---|
| **Claude Code (Anthropic)** | Langer Kontext (200k Token), exzellentes Architekturverständnis, CLI-Integration, Datei-Operationen ohne Copy-Paste | Kostenpflichtig (API-Nutzung) |
| GitHub Copilot | IDE-Integration, schnelle Inline-Completions | Kein Projektkontext, nur Zeilen-/Funktionsebene |
| Cursor AI | IDE mit Chat, Codebase-Indexierung | Weniger stark bei komplexen Architektur-Entscheidungen |
| Windsurf (Codeium) | Kostenlos, IDE-integriert | Schwächeres Reasoning bei domänenspezifischen Constraints |
| ChatGPT / GPT-4o | Breites Allgemeinwissen | Kein direkter Dateizugriff, viel Copy-Paste nötig |

### Entscheidung: Claude Code als Primär-Tool

**Begründung:**

1. **Projektweiter Kontext:** Claude Code liest alle relevanten Dateien selbstständig und behält den vollständigen Architekturkontext über mehrere Requests hinweg. Für ein Clean-Architecture-Projekt mit strikten Schichtengrenzen ist das entscheidend.

2. **Architektur-Compliance:** Bei der Generierung neuer Komponenten hat Claude Code konsequent die festgelegten Schichtengrenzen eingehalten (z.B. nie SQLAlchemy-Imports in Application-Services eingeführt).

3. **Fehleridentifikation:** Claude Code hat eigenständig Bugs im AI-generierten Code identifiziert (fehlendes `update()` im Repository-Interface, fehlende Exception-Abfangung in API-Endpoints).

4. **CLI-Workflow:** Keine Copy-Paste-Zyklen zwischen Chat und IDE — Änderungen werden direkt in Dateien geschrieben und sofort testbar.

5. **Modellqualität:** Claude Sonnet/Opus produziert bei komplexen Anfragen (Statusmaschinen, Protocol-Interfaces, CI/CD-Konfiguration) konsistent korrekte und idiomatische Python-/TypeScript-Ausgaben.

**Verbleibende Schwächen (beobachtet):**
- Interface-Vollständigkeit: `update()` im `InvoiceRepository` wurde initial weggelassen → manuell ergänzt
- Exception-Mapping: `InvalidStatusTransitionError` wurde nicht automatisch auf HTTP 422 gemappt → manuell korrigiert
- Fazit: Architekturstruktur korrekt, aber edge-cases in Fehlerbehandlung erfordern Review

### Modell-Entscheidung

Eingesetzt wurde **Claude Sonnet** (claude-sonnet-4) für alle Aufgaben in diesem Projekt:
- Ausreichende Reasoning-Tiefe für Architekturentscheidungen
- Schnellere Antworten als Opus bei vergleichbarer Qualität für Code-Generierung
- Kostengünstiger als Opus bei hohem Token-Volumen (viele Datei-Reads im Projektkontext)

---

## Konkrete Einsatzbeispiele mit Prompts

### 1. Projektstruktur und Schichtenarchitektur

**Prompt:**
> "Entwirf eine saubere Schichtenarchitektur für ein FastAPI-Backend mit Domain-Driven Design-Prinzipien: Domain-, Application-, Interface- und Infrastructure-Layer. Domain-Objekte sollen keine Framework-Abhängigkeiten haben."

**AI-Output:** Paketstruktur `app/domain`, `app/application`, `app/api/v1`, `app/infrastructure` mit Abhängigkeitsrichtung (Domain kennt niemanden, Infrastructure kennt alle).

**Menschliche Anpassung:** Vereinfachung auf Python-Dataclasses statt vollständigem DDD mit Value Objects und Aggregates — pragmatischer Mittelweg für Projekt-Scope.

---

### 2. Repository-Pattern mit Protocol-Interfaces

**Prompt:**
> "Erstelle Repository-Interfaces für Ticket, Invoice, Technician, Tenant, Unit und Property als Python Protocol-Klassen, damit sie ohne Mock-Framework in Unit-Tests mit In-Memory-Implementierungen ersetzt werden können."

**AI-Output:** Vollständige `repositories.py` im Application-Layer mit `Protocol`-Interfaces.

**Identifizierter Bug:** `update()` fehlte im `InvoiceRepository`-Protocol → `pay_invoice()` hätte `add()` missbraucht und doppelte Einträge erzeugt.

**Korrektur:** `update(self, invoice: Invoice) -> Invoice` manuell ergänzt; entsprechende SQLAlchemy-Implementierung und In-Memory-Implementierung (Tests) nachgezogen.

---

### 3. Statusmaschine im Domain-Modell

**Prompt:**
> "Implementiere eine Ticket-Statusmaschine in der Domain-Klasse MaintenanceTicket mit den Zuständen OPEN, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED. Ungültige Übergänge sollen eine eigene Exception werfen."

**AI-Output:** `_transition_status()` mit `ALLOWED_STATUS_TRANSITIONS`-Dictionary und `InvalidStatusTransitionError`.

**Identifizierter Bug:** `InvalidStatusTransitionError` wurde in API-Endpoints nicht abgefangen → HTTP 500 statt 422 bei ungültigen Übergängen.

**Korrektur:** `except InvalidStatusTransitionError` in alle vier Transition-Endpoints (`assign`, `start`, `resolve`, `close`) manuell ergänzt.

---

### 4. CI/CD-Workflows

**Prompt:**
> "Erstelle GitHub Actions Workflows für CI (Push/PR auf main), Release (bei Git-Tag v*). CI soll Backend-Tests, Linting (ruff, mypy) und Frontend-Build (tsc, npm run build) abdecken."

**AI-Output:** Initiale sequenzielle Workflows.

**Menschliche Verbesserungen:**
- Backend- und Frontend-Jobs parallelisiert (sequenziell mit `needs: backend` war unnötig)
- `mypy`-Typecheck und `tsc --noEmit` ergänzt
- GitHub Release mit `softprops/action-gh-release@v2` im Release-Workflow ergänzt

---

### 5. Testfallgenerierung (TDD-Unterstützung)

**Prompt:**
> "Generiere Unit-Tests für TicketLifecycleService und BillingService mit In-Memory-Repositories. Decke Happy Path und Fehlerfälle ab (ungültiger Statusübergang, doppelte Rechnung, bereits bezahlte Rechnung)."

**AI-Output:** Grundstruktur mit Happy-Path-Tests und In-Memory-Repos.

**Menschliche Ergänzungen (Negativ-Pfade):**
- `test_invalid_status_transition_raises_error`: OPEN → IN_PROGRESS ist verboten
- `test_billing_service_prevents_duplicate_invoice`: BusinessRuleViolationError bei Duplikat
- `test_pay_already_paid_invoice_raises_error`: Idempotenz-Schutz

---

### 6. Docker und docker-compose

**Prompt:**
> "Erstelle Dockerfiles für FastAPI-Backend (Python 3.12, multi-stage) und React-Frontend (Node 20, Nginx) sowie docker-compose.yml mit PostgreSQL und Health-Checks."

**AI-Output:** Funktionsfähige Dockerfiles und docker-compose.yml.

**Menschliche Anpassung:** SQLite-Fallback für lokalen Betrieb ohne Docker ergänzt (DATABASE_URL-Konfiguration via pydantic-settings).

---

## Lessons Learned

| Beobachtung | Konsequenz |
|---|---|
| Architekturstruktur korrekt generiert | Schichten-Boilerplate via AI effizient |
| Interface-Vollständigkeit unvollständig | Jede Protocol-Klasse nach Generierung auf Vollständigkeit prüfen |
| Exception-Mapping vergessen | HTTP-Fehler-Mapping nach Generierung systematisch testen |
| Negativ-Testfälle fehlen | Fehlerfall-Tests manuell nachdenken und ergänzen |
| Prompts mit Architekturvorgaben >> offene Prompts | Immer Schicht, Interface und Fehlerverhalten im Prompt spezifizieren |
