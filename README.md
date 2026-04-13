# Smart Property Maintenance System

![CI](https://github.com/daliah7/Smart-Property-Maintenance-System/actions/workflows/ci.yml/badge.svg)
![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)
![Coverage](https://img.shields.io/badge/Tests-Unit%20%7C%20Integration%20%7C%20E2E-success)
![License](https://img.shields.io/badge/License-MIT-green)

> **AI-assisted Full-Stack Capstone Project** — Clean Architecture · TDD · CI/CD · Cloud Deployment · Bilingual UI

---

## Inhaltsverzeichnis

1. [Das Problem & die Lösung](#1-das-problem--die-lösung)
2. [Projektübersicht & Features](#2-projektübersicht--features)
3. [AI-assisted Development](#3-ai-assisted-development)
4. [Systemarchitektur](#4-systemarchitektur)
5. [Domänenmodell & Business-Logik](#5-domänenmodell--business-logik)
6. [Tech Stack & Designentscheidungen](#6-tech-stack--designentscheidungen)
7. [Schnellstart](#7-schnellstart)
8. [Lokales Setup ohne Docker](#8-lokales-setup-ohne-docker)
9. [API-Referenz](#9-api-referenz)
10. [Testing & Qualitätssicherung](#10-testing--qualitätssicherung)
11. [CI/CD Pipeline](#11-cicd-pipeline)
12. [Cloud Deployment](#12-cloud-deployment)
13. [Projektmanagement (Scrum)](#13-projektmanagement-scrum)
14. [Bekannte Limitationen & Erweiterungen](#14-bekannte-limitationen--erweiterungen)

---

## 1. Das Problem & die Lösung

### Das reale Problem

Hausverwaltungen in der Schweiz und Deutschland koordinieren Wartungsanfragen von Mietern bis heute überwiegend analog: per Telefon, E-Mail oder Papierformular. Das führt zu konkreten, messbaren Problemen:

- **Vergessene Aufgaben** — Meldungen gehen in überfüllten Posteingängen unter
- **Falsche Zuweisung** — Ein Maler wird für einen Wasserrohrbruch gerufen
- **Fehlende Priorisierung** — Ein Heizungsausfall im Winter wird gleich behandelt wie ein Kratzer in der Wand
- **Intransparenz** — Mieter wissen nicht, was mit ihrer Meldung passiert
- **Rechnungschaos** — Rechnungen werden zu früh oder gar nicht erstellt

### Die Lösung: Smart Property Maintenance System (SPMS)

SPMS digitalisiert den gesamten Wartungsprozess mit einem strukturierten, regelbasierten Ticket-System:

```
  Schadensmeldung einreichen
          │
          ▼
    ┌───────────┐    KI-Zuweisung    ┌────────────┐    Arbeit starten   ┌─────────────┐
    │   OPEN    │ ─────────────────► │  ASSIGNED  │ ──────────────────► │ IN_PROGRESS │
    └───────────┘                    └────────────┘                      └──────┬──────┘
    KI priorisiert                  Bester Techniker                            │ erledigt
    automatisch                     nach Fachgebiet                             ▼
                                                                        ┌──────────────┐
                                                              ┌─────────│   RESOLVED   │
                                                              │         └──────────────┘
                                                       Rechnung               │ schliessen
                                                       erstellen &            ▼
                                                       bezahlen        ┌──────────────┐
                                                                       │    CLOSED    │
                                                                       └──────────────┘
```

**Jeder Statusübergang ist durch Business-Regeln im Domain-Layer erzwungen** — kein Schritt kann übersprungen werden. Ungültige Übergänge (z.B. direkt von OPEN zu IN_PROGRESS) werfen einen `InvalidStatusTransitionError` → HTTP 422.

---

## 2. Projektübersicht & Features

### Kernfunktionen

| Feature | Beschreibung |
|---|---|
| **Ticket-Lifecycle** | Vollständiger 5-stufiger Workflow: OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED |
| **KI-Priorisierung** | Automatische Einstufung als HIGH / MEDIUM / LOW basierend auf Keyword-Analyse in Titel und Beschreibung |
| **KI-Auto-Zuweisung** | Scoring-Algorithmus wählt den am besten geeigneten Techniker anhand von Keyword-Überschneidungen mit dem Fachgebiet |
| **Invoice-Workflow** | Rechnungen können nur für RESOLVED-Tickets erstellt werden — maximal eine pro Ticket |
| **Zweisprachige UI** | Vollständige DE / EN Lokalisierung ohne externes i18n-Framework, umschaltbar per Klick |
| **4-seitige Navigation** | Dashboard · Tickets · Techniker · Objekte — ohne externe Router-Library |
| **Echtzeit-Statistiken** | Live-Dashboard mit Prioritätsverteilung, Techniker-Auslastung und neuesten Tickets |
| **Priorisierte Listenansicht** | Tickets sortiert nach Priorität (HIGH → MEDIUM → LOW) und Erstellungsdatum |

### Dashboard

Das Dashboard gibt einen sofortigen Überblick über den Systemzustand:
- **Anklickbare Stat-Karten** — direkter Sprung zur gefilterten Ticket-Liste
- **Prioritätsverteilung** — Balkendiagramm mit HIGH / MEDIUM / LOW Counts
- **Techniker-Auslastungstabelle** — Offene, aktive und abgeschlossene Tickets pro Techniker
- **Neueste Tickets** — Die 6 zuletzt erstellten Tickets mit Status

### Techniker-Seite

Karten-Ansicht aller Fachkräfte mit:
- Avatar aus Initialen
- Fachgebiet-Tags (z.B. `Elektrik`, `Strom`, `Kurzschluss`)
- Ticket-Statistiken: Offen / Aktiv / Erledigt
- Auslastungsbalken

### Objekte-Seite

Vollständige Hierarchie aller Liegenschaften:
- Property → Units → Mieter
- Offene Ticket-Hinweise pro Einheit
- Mieter-Name und E-Mail auf einen Blick

---

## 3. AI-assisted Development

Dieses Projekt wurde von Anfang bis Ende mit **Claude Code** (Anthropic) als AI-Coding-Agent entwickelt. Die vollständige Dokumentation des AI-Einsatzes ist in [`AGENTS.md`](AGENTS.md) festgehalten.

### Verwendete Modelle & Tools

| Tool | Modell | Einsatz |
|---|---|---|
| **Claude Code** | Claude Sonnet 4.6 | Primärer Coding-Agent — Architektur, Implementierung, Tests |
| **GitHub Copilot** | GPT-4o | Inline-Vervollständigungen im Editor |
| **Cursor** | Claude 3.5 | Verglichen, aber nicht eingesetzt |
| **ChatGPT** | GPT-4o | Konzept-Brainstorming in Frühphase |

**Warum Claude Code?** Claude Code liefert zusammenhängende, architekturkonforme Änderungen über mehrere Dateien hinweg. Copilot ist auf Zeilen-/Funktionsebene stark, verliert aber bei grossen Refactorings den Kontext. Für ein Clean-Architecture-Projekt mit strikten Schichtenregeln ist Claude Code deutlich überlegen.

### Spec-driven Development

Jede Funktion wurde spec-first entwickelt:

1. **Spezifikation schreiben** (in `AGENTS.md` oder als Kommentar)
2. **Test schreiben** (Red — Test schlägt fehl)
3. **Claude Code implementiert** die Funktion
4. **Test läuft durch** (Green)
5. **Refactor** falls nötig

### KI-Features im Code

**Automatische Prioritätserkennung** (`app/domain/enums.py`):
```python
HIGH_PRIORITY_KEYWORDS = {
    "notfall", "dringend", "wasser", "rohrbruch", "strom",
    "kurzschluss", "heizung", "brand", "gas", "ausfall", ...
}
LOW_PRIORITY_KEYWORDS = {
    "routine", "wartung", "kosmetisch", "inspektion", "farbe", ...
}

def infer_priority(title: str, description: str) -> TicketPriority:
    words = set(f"{title} {description}".lower().split())
    if words & HIGH_PRIORITY_KEYWORDS:
        return TicketPriority.HIGH
    if words & LOW_PRIORITY_KEYWORDS:
        return TicketPriority.LOW
    return TicketPriority.MEDIUM
```

**Intelligente Techniker-Zuweisung** (`app/application/services.py`):
```python
def score(tech: Technician) -> int:
    return sum(
        2 if kw in text.split() else (1 if kw[:4] in text else 0)
        for kw in tech.expertise.lower().split()
    )
best = max(technicians, key=score)
```

Ein Ticket mit "Heizungsausfall" und "Warmwasser" erhält:
- Tim Berger (Sanitär / Heizung / Wasser) → Score: **8**
- Lea Hoffmann (Elektrik / Strom) → Score: **0**
- → Tim Berger wird automatisch zugewiesen ✓

### Identifizierte Bugs im generierten Code

| Bug | Ursache | Fix |
|---|---|---|
| Falscher DB-Pfad `./backend/dev.db` | Relativer Pfad bricht je nach Working Directory | Geändert zu `./dev.db` |
| `TicketPriority` Import unused Warning | Import nicht an richtiger Stelle | In Top-Level-Imports verschoben |
| `onAutoAssign` nie aufgerufen | Props-Kette unvollständig | In `App.tsx` korrekt verdrahtet |
| `PriorityBadge` deklariert aber nie gerendert | Vergessen ins JSX einzufügen | In TicketDetail Header eingefügt |

---

## 4. Systemarchitektur

### Schichtenmodell (Clean Architecture)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                            │
│          React 18 · TypeScript 5 · Vite · CSS Custom Properties     │
│          4-seitige Navigation · Glassmorphism Design                 │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTP / JSON (Fetch API)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          API LAYER                                   │
│     FastAPI Routers · Pydantic v2 Schemas · OpenAPI / Swagger       │
│     HTTP Error Mapping: 404 → NotFoundError, 422 → Transition       │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ ruft auf
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                               │
│         TicketLifecycleService · BillingService                     │
│         Orchestrierung · Validierung · Repository-Aufrufe           │
└──────────┬────────────────────────────────────────┬─────────────────┘
           │ arbeitet mit Domain-Objekten            │ via Protocol-Interfaces
           ▼                                         ▼
┌─────────────────────┐              ┌───────────────────────────────┐
│    DOMAIN LAYER     │              │     INFRASTRUCTURE LAYER      │
│  MaintenanceTicket  │              │  SqlAlchemy-Repositories      │
│  Invoice            │              │  ORM-Modelle (models.py)      │
│  Statusmaschine     │              │  Alembic-Migrationen          │
│  infer_priority()   │              │  Inline-Migration (priority)  │
│  Business-Regeln    │              └──────────────┬────────────────┘
└─────────────────────┘                             │
                                                    ▼
                                    ┌───────────────────────────────┐
                                    │         DATABASE              │
                                    │  PostgreSQL (Produktion)      │
                                    │  SQLite (Entwicklung / Tests) │
                                    └───────────────────────────────┘
```

### Abhängigkeitsregel

- **Domain** kennt niemanden — reine Python-Dataclasses, keine Framework-Imports
- **Application** kennt nur Domain (via Repository-Protocols)
- **Infrastructure** implementiert die Protocols und kennt SQLAlchemy
- **API** kennt Application und gibt HTTP-Fehler zurück

### Repository Pattern mit Python Protocol

```python
# app/application/repositories.py — Interface (keine Implementierung)
class TicketRepository(Protocol):
    def get(self, ticket_id: int) -> MaintenanceTicket: ...
    def add(self, ticket: MaintenanceTicket) -> MaintenanceTicket: ...
    def update(self, ticket: MaintenanceTicket) -> MaintenanceTicket: ...
    def list(self, status: Optional[str] = None) -> list[MaintenanceTicket]: ...
```

Unit-Tests verwenden In-Memory-Implementierungen — **kein Mock-Framework nötig, kein I/O**.

---

## 5. Domänenmodell & Business-Logik

### Entitäten (6 Domain-Objekte)

```
Property ──< Unit ──< Tenant
                │
                └──< MaintenanceTicket ──< Invoice
                         │
                         └──> Technician
```

| Entität | Beschreibung | Kernfelder |
|---|---|---|
| `Property` | Liegenschaft / Immobilie | `name`, `address` |
| `Unit` | Wohneinheit innerhalb einer Property | `name`, `floor`, `property_id` |
| `Tenant` | Mieter, fest einer Unit zugeordnet | `name`, `email`, `unit_id` |
| `Technician` | Handwerker mit Fachgebiet-String | `name`, `expertise` |
| `MaintenanceTicket` | Zentrales Aggregate | `status`, `priority`, `title`, `description` |
| `Invoice` | Rechnung zu einem Ticket | `amount`, `paid`, `paid_at` |

### Ticket-Statusmaschine

```python
ALLOWED_STATUS_TRANSITIONS = {
    TicketStatus.OPEN:        [TicketStatus.ASSIGNED],
    TicketStatus.ASSIGNED:    [TicketStatus.IN_PROGRESS],
    TicketStatus.IN_PROGRESS: [TicketStatus.RESOLVED],
    TicketStatus.RESOLVED:    [TicketStatus.CLOSED],
    TicketStatus.CLOSED:      [],   # Terminal state
}
```

Übergänge sind **im Domain-Objekt selbst** implementiert (nicht im Service). Das Ticket ist das Aggregate und kennt seine eigenen Regeln.

### Business-Regeln (alle enforced im Domain/Application-Layer)

| Regel | Wo erzwungen | Fehler |
|---|---|---|
| Statusübergänge müssen der definierten Reihenfolge folgen | `MaintenanceTicket._transition_status()` | `InvalidStatusTransitionError` → HTTP 422 |
| Mieter muss in der Ticket-Unit registriert sein | `TicketLifecycleService.create_ticket()` | `BusinessRuleViolationError` → HTTP 400 |
| Invoice nur für RESOLVED-Tickets | `MaintenanceTicket.can_create_invoice()` | `BusinessRuleViolationError` → HTTP 400 |
| Pro Ticket maximal eine Invoice | `BillingService.create_invoice()` | `BusinessRuleViolationError` → HTTP 400 |
| Invoice kann nur einmal bezahlt werden | `Invoice.mark_paid()` | `BusinessRuleViolationError` → HTTP 400 |
| Auto-Assign nur für OPEN-Tickets | `TicketLifecycleService.auto_assign_ticket()` | `InvalidStatusTransitionError` → HTTP 422 |
| Mindestens ein Techniker muss vorhanden sein | `TicketLifecycleService.auto_assign_ticket()` | `BusinessRuleViolationError` → HTTP 400 |

---

## 6. Tech Stack & Designentscheidungen

### Backend

| Technologie | Version | Warum |
|---|---|---|
| **Python** | 3.12 | Moderne Syntax (match/case, Walrus), native Type Hints, breites Ökosystem |
| **FastAPI** | 0.109+ | Nativ async, automatische OpenAPI-Docs, Pydantic-Integration, minimaler Overhead |
| **SQLAlchemy** | 2.x | Modernes ORM, explizites Session-Management, keine magischen Hintergrund-Operationen |
| **Pydantic v2** | 2.x | Rust-basierte Validierung (10× schneller als v1), strikte Typen, `EmailStr`, `Decimal` |
| **Alembic** | 1.x | Versionierte DB-Migrationen, kompatibel mit Render PostgreSQL |
| **pytest** | 8.x | Einfache Fixtures, parametrisierte Tests, nativer Coverage-Support |
| **ruff** | 0.3+ | Ersetzt flake8+isort+pyupgrade in einem Tool, 100× schneller als flake8 |

### Frontend

| Technologie | Version | Warum |
|---|---|---|
| **React** | 18 | Hooks-basiert, grosse Community, ideal für zustandsbasierte UIs |
| **TypeScript** | 5 | Compile-Zeit-Typsicherheit, Refactoring-Sicherheit, typsichere i18n-Keys |
| **Vite** | 5 | HMR in < 50ms, schnellster Build im Ökosystem, native ESModules |
| **CSS Custom Properties** | — | Kein CSS-Framework-Overhead, vollständige Kontrolle, Glassmorphism-Effekte |
| **Eigenes i18n** | — | Typsichere Translation-Keys (`TranslationKey`), kein Paket-Overhead, DE/EN |

### Infrastruktur

| Technologie | Einsatz |
|---|---|
| **Docker (multi-stage)** | Produktions-Images für Backend und Frontend |
| **docker-compose** | Lokales Setup mit einem Befehl |
| **GitHub Actions** | CI/CD: parallele Backend/Frontend-Jobs, Release-Workflow |
| **Render.com** | Cloud-Deployment via `render.yaml` |
| **PostgreSQL** | Produktionsdatenbank (Render Managed DB) |
| **SQLite** | Entwicklung & Tests (kein DB-Server nötig) |

---

## 7. Schnellstart

```bash
# Gesamtes System starten (Backend + Frontend + PostgreSQL)
docker compose up --build
```

| Service | URL | Beschreibung |
|---|---|---|
| Frontend | http://localhost:5173 | React-Applikation |
| Backend API | http://localhost:8000 | FastAPI REST-API |
| Swagger UI | http://localhost:8000/docs | Interaktive API-Dokumentation |
| ReDoc | http://localhost:8000/redoc | Alternative API-Dokumentation |

---

## 8. Lokales Setup ohne Docker

### Voraussetzungen

- Python 3.12+
- Node.js 20+
- Git

### Backend

```bash
# 1. Dependencies installieren
pip install -r backend/requirements.txt

# 2. Backend starten (aus dem backend/-Verzeichnis)
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Beim ersten Start wird automatisch:
- Eine SQLite-Datenbank (`dev.db`) angelegt
- Alle Tabellen erstellt
- Demo-Daten eingespielt (3 Properties, 8 Units, 8 Mieter, 7 Techniker, 12 Tickets)

### Frontend

```bash
# Separates Terminal (aus dem Projekt-Root)
cd frontend
npm install
npm run dev
```

### Datenbank zurücksetzen

```bash
# Backend stoppen, dann:
rm backend/dev.db
# Backend neu starten — Seed läuft automatisch
```

---

## 9. API-Referenz

Alle Endpunkte sind unter dem Prefix `/api` erreichbar. Die vollständige interaktive Dokumentation ist unter **http://localhost:8000/docs** verfügbar.

### Properties & Units

| Methode | Endpunkt | Beschreibung | Request Body |
|---|---|---|---|
| `POST` | `/api/properties/` | Property anlegen | `{"name": "...", "address": "..."}` |
| `GET` | `/api/properties/` | Alle Properties | — |
| `GET` | `/api/properties/{id}` | Einzelne Property | — |
| `POST` | `/api/units/` | Unit anlegen | `{"property_id": 1, "name": "A1", "floor": "EG"}` |
| `GET` | `/api/units/` | Alle Units | — |

### Mieter & Techniker

| Methode | Endpunkt | Beschreibung | Request Body |
|---|---|---|---|
| `POST` | `/api/tenants/` | Mieter anlegen | `{"name": "...", "email": "...", "unit_id": 1}` |
| `GET` | `/api/tenants/` | Alle Mieter | — |
| `POST` | `/api/technicians/` | Techniker anlegen | `{"name": "...", "expertise": "Elektrik Strom"}` |
| `GET` | `/api/technicians/` | Alle Techniker | — |

### Tickets (Kernfunktionalität)

| Methode | Endpunkt | Beschreibung | Request Body |
|---|---|---|---|
| `POST` | `/api/tickets/` | Ticket erstellen → `OPEN`, Priorität auto-inferiert | `{"title": "...", "description": "...", "unit_id": 1}` |
| `GET` | `/api/tickets/` | Alle Tickets (optional `?status=OPEN`) | — |
| `GET` | `/api/tickets/{id}` | Einzelnes Ticket | — |
| `PATCH` | `/api/tickets/{id}/auto-assign` | KI-Zuweisung → `ASSIGNED` | — |
| `PATCH` | `/api/tickets/{id}/assign` | Manuelle Zuweisung → `ASSIGNED` | `{"technician_id": 2}` |
| `PATCH` | `/api/tickets/{id}/start` | Arbeit starten → `IN_PROGRESS` | — |
| `PATCH` | `/api/tickets/{id}/resolve` | Als erledigt markieren → `RESOLVED` | — |
| `PATCH` | `/api/tickets/{id}/close` | Archivieren → `CLOSED` | — |

### Rechnungen

| Methode | Endpunkt | Beschreibung | Request Body |
|---|---|---|---|
| `POST` | `/api/tickets/{id}/invoice` | Rechnung erstellen (nur `RESOLVED`) | `{"amount": 250.00}` |
| `GET` | `/api/tickets/{id}/invoice` | Rechnung eines Tickets abrufen | — |
| `PATCH` | `/api/invoices/{id}/pay` | Rechnung bezahlen | — |

### HTTP-Fehlercodes

| Code | Ursache |
|---|---|
| `404 Not Found` | Ticket / Techniker / Invoice nicht gefunden |
| `400 Bad Request` | Business-Regel verletzt (doppelte Invoice, Mieter in falscher Unit) |
| `422 Unprocessable Entity` | Ungültiger Statusübergang (z.B. OPEN → IN_PROGRESS) |

---

## 10. Testing & Qualitätssicherung

### Testing-Pyramid

```
          ┌─────────────┐
          │    E2E      │  Playwright — vollständiger User-Flow im Browser
          │   Tests     │  (1 Spec-File, 8 Szenarien)
          └──────┬──────┘
         ┌───────┴────────┐
         │  Integration   │  FastAPI TestClient + SQLite in-memory
         │    Tests       │  (20+ Testfälle, echter HTTP-Stack)
         └───────┬────────┘
    ┌────────────┴────────────┐
    │      Unit Tests         │  In-Memory-Repositories, kein I/O
    │  (Domain + Application) │  (30+ Testfälle, blitzschnell)
    └─────────────────────────┘
```

### Unit Tests

Testen die Business-Logik **isoliert** — keine Datenbank, kein HTTP, keine Mocks:

```bash
cd backend && pytest tests/unit -v
```

Abgedeckt:
- Alle 5 Statusübergänge (positiv + negativ)
- `infer_priority()` mit 7 Keyword-Kombinationen
- `auto_assign_ticket()` — Scoring-Algorithmus
- Invoice-Regeln (nur RESOLVED, max. eine, nur einmal bezahlen)
- Tenant-Unit-Validierung

### Integrationstests

Testen die komplette API-Schicht inkl. Datenbank:

```bash
cd backend && pytest tests/integration -v
```

Abgedeckt:
- Vollständiger Ticket-Lifecycle über HTTP
- Alle Fehler-Pfade (422, 400, 404)
- Invoice-Workflow end-to-end

### E2E Tests (Playwright)

Testen den vollständigen Browser-Flow:

```bash
cd frontend && npx playwright test
```

Abgedeckt:
- Ticket erstellen und in der Liste sehen
- Auto-Assign und manuelles Assign
- Lifecycle von OPEN bis CLOSED
- Rechnungserstellung und Bezahlung

### Coverage

```bash
cd backend && pytest --cov=app --cov-report=term-missing
```

### Code-Qualität

```bash
# Linting (ruff)
cd backend && ruff check app/

# Type-Checking (mypy)
cd backend && mypy app/

# Frontend Type-Check
cd frontend && npx tsc --noEmit
```

### TDD-Nachweis

Vollständige Dokumentation der Red-Green-Refactor-Zyklen in [`docs/tdd.md`](docs/tdd.md):
- Zyklus 1: Ungültiger Statusübergang
- Zyklus 2: Prioritätsinfferenz
- Zyklus 3: Auto-Assign Scoring
- Zyklus 4: Invoice-Duplikat-Schutz

---

## 11. CI/CD Pipeline

### Continuous Integration

Bei jedem Push und Pull Request auf `main` laufen parallel zwei Jobs:

```
Push / PR auf main
       │
       ├── backend-job ──────────────────────────────────────────────┐
       │    ruff lint → mypy typecheck → pytest unit → pytest integ  │
       │                                                              ├── parallel
       └── frontend-job ─────────────────────────────────────────────┘
            npm install → tsc --noEmit → npm run build
```

### Release-Workflow

Bei einem Git-Tag `v*` (z.B. `v1.0.0`):

```
Git Tag v* pushen
       │
       ├── Backend-Tests (Unit + Integration)
       ├── Frontend Build
       ├── Docker-Image Backend bauen (spms-backend:v1.0.0)
       ├── Docker-Image Frontend bauen (spms-frontend:v1.0.0)
       └── GitHub Release erstellen (automatische Release Notes)
```

| Workflow | Datei | Trigger |
|---|---|---|
| CI | `.github/workflows/ci.yml` | Push / PR auf `main` |
| E2E | `.github/workflows/e2e.yml` | Push auf `main` |
| Deploy | `.github/workflows/deploy.yml` | Push auf `main` |
| Release | `.github/workflows/release.yml` | Git-Tag `v*` |

---

## 12. Cloud Deployment

### Render.com (produktionsbereit)

Die Datei [`render.yaml`](render.yaml) konfiguriert automatisch:

```yaml
services:
  - type: web
    name: spms-backend
    runtime: python
    buildCommand: pip install -r backend/requirements.txt
    startCommand: cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT

databases:
  - name: spms
    databaseName: spms
    plan: free
```

- **Backend** als Web Service (Python, automatisches Deployment bei Push)
- **PostgreSQL** als Managed Database
- `DATABASE_URL` via `fromDatabase.connectionString` (kein Hardcode von Credentials)
- `CORS_ORIGINS` für die Frontend-Domain konfigurierbar

### Demo-Flow für die Präsentation

1. **Frontend öffnen** → http://localhost:5173
2. **Sprache wechseln** → oben rechts zwischen 🇩🇪 DE und 🇬🇧 EN umschalten
3. **Dashboard** ansehen → Stats, Prioritätsverteilung, Techniker-Auslastung
4. **Ticket anlegen** → Titel mit "Wasserschaden" → KI erkennt automatisch HIGH
5. **Ticket auswählen** → Lifecycle-Stepper zeigt aktuellen Status
6. **Auto-Zuweisung** → "⚡ Auto-Zuweisung" klicken — Tim Berger (Sanitär) wird gewählt
7. **Arbeit starten → Als erledigt markieren**
8. **Rechnung erstellen** → Betrag eingeben → Bezahlen → Ticket schliessen
9. **Negativ-Demo** → Ticket direkt von OPEN auf IN_PROGRESS — Error-Toast zeigt HTTP 422
10. **Swagger UI** → http://localhost:8000/docs — alle Endpunkte live testen

---

## 13. Projektmanagement (Scrum)

Vollständige Dokumentation in [`docs/scrum.md`](docs/scrum.md).

### Sprints (3 × 1 Woche)

| Sprint | Fokus | Highlights |
|---|---|---|
| **Sprint 1** | Backend-Foundation | Clean Architecture, Domain-Modell, Repository Pattern, Unit Tests |
| **Sprint 2** | API + Frontend | FastAPI-Routers, React UI, Ticket-Lifecycle, Invoice-Workflow |
| **Sprint 3** | KI + Polish | Auto-Priorisierung, Auto-Zuweisung, Bilingual UI, CI/CD, Dashboard |

### User Stories (Auswahl)

- **US-01** (Must): Als Verwalter möchte ich Tickets erstellen, damit ich Schäden erfassen kann
- **US-05** (Must): Als System soll die Priorität automatisch erkannt werden
- **US-06** (Must): Als Verwalter möchte ich auto-assign nutzen, damit ich Zeit spare
- **US-09** (Should): Als Nutzer möchte ich die Sprache wechseln können
- **US-12** (Could): Als Verwalter möchte ich ein Dashboard mit Statistiken sehen

### Definition of Done

Ein Feature gilt als abgeschlossen wenn:
- Unit-Test vorhanden und grün
- Integrationstest vorhanden und grün
- Code durch Linter (ruff/tsc) ohne Fehler
- API-Endpunkt in Swagger dokumentiert
- Frontend-Komponente zweisprachig (DE/EN)
- PR auf `main` gemergt, CI grün

---

## 14. Bekannte Limitationen & Erweiterungen

### Bewusste Scope-Entscheidungen

| Limitation | Begründung |
|---|---|
| Keine Benutzer-Authentifizierung | Hätte den Scope gesprengt; dokumentiert in `docs/scrum.md` als Must-Have v2.0 |
| Kein WebSocket (Echtzeit-Updates) | Über Polling lösbar; ausserhalb des Projektscopes |
| Keyword-Matching ohne ML-Modell | Regelbasiert ist deterministisch und vollständig testbar; NLP-Erweiterung möglich ohne API-Änderung |

### Erweiterungsmöglichkeiten (v2.0)

- **JWT-Authentifizierung** mit Rollen: Verwalter / Techniker / Mieter
- **WebSocket-Benachrichtigungen** für Echtzeit-Updates
- **NLP-basierte Prioritätserkennung** (Hugging Face Transformers / spaCy)
- **E-Mail-Benachrichtigungen** via SendGrid/Postmark bei Ticket-Updates
- **Anhänge** (Fotos vom Schaden) via S3/Cloudinary
- **Kommentarhistorie** pro Ticket
- **Techniker-App** (Mobile-optimiertes Frontend)
- **Reporting** (PDF-Export, Monatsberichte)

---

## Weiterführende Dokumentation

| Dokument | Inhalt |
|---|---|
| [`AGENTS.md`](AGENTS.md) | WHY/WHAT/HOW für AI-Agenten, LLM-Vergleich, Prompt-Beispiele |
| [`docs/architecture.md`](docs/architecture.md) | Detailliertes Schichtendiagramm, alle ADRs |
| [`docs/scrum.md`](docs/scrum.md) | Vollständiges Product Backlog, Sprint-Protokolle, Velocity |
| [`docs/tdd.md`](docs/tdd.md) | Red-Green-Refactor-Nachweis mit echtem Projektcode |

---

*Entwickelt mit [Claude Code](https://claude.ai/claude-code) — AI-assisted Full-Stack Capstone, 3 Credits*
