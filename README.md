# Smart Property Maintenance System

![CI](https://github.com/your-org/smart-property-maintenance/actions/workflows/ci.yml/badge.svg)
![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

> AI-assisted Full-Stack Capstone · Clean Architecture · TDD · CI/CD · Cloud-Deployment

---

## Das Problem

Hausverwaltungen koordinieren Wartungsanfragen heute per E-Mail, Telefon oder Papier.
Das Ergebnis: Aufgaben werden vergessen, Techniker doppelt gebucht, Rechnungen verzögert.

**Smart Property Maintenance** digitalisiert diesen Prozess mit einem streng geregelten Ticket-Lifecycle:

```
  Schadensmeldung
       │
       ▼
  ┌─────────┐    zuweisen    ┌──────────┐    starten     ┌─────────────┐
  │  OPEN   │ ─────────────► │ ASSIGNED │ ──────────────► │ IN_PROGRESS │
  └─────────┘                └──────────┘                 └─────────────┘
                                                                 │
                         ┌──────────┐   schliessen   ┌──────────┴──┐
                         │  CLOSED  │ ◄────────────── │  RESOLVED   │
                         └──────────┘                 └─────────────┘
                                                             │
                                                       Rechnung erstellen
                                                       & bezahlen
```

Jeder Übergang wird durch Business-Regeln erzwungen — kein Schritt kann übersprungen werden.

---

## Features auf einen Blick

| Feature | Details |
|---|---|
| **KI-Priorisierung** | Tickets werden automatisch als HIGH / MEDIUM / LOW eingestuft — basierend auf Keyword-Analyse von Titel und Beschreibung (Notfall, Wasserschaden, Stromausfall → HIGH) |
| **KI-Auto-Zuweisung** | Techniker werden durch einen Scoring-Algorithmus ausgewählt: Keywords im Ticket werden mit dem Fachgebiet des Technikers verglichen — bester Match gewinnt |
| **5-stufiger Lifecycle** | OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED, mit visuellem Stepper im Frontend |
| **Invoice-Workflow** | Rechnungen können nach Abschluss erstellt und bezahlt werden — mit Statusverfolgung |
| **Zweisprachige UI** | Vollständige DE / EN Lokalisierung, umschaltbar per Sprachwähler — ohne externes i18n-Framework |
| **Live-Statistiken** | Stats-Bar zeigt Gesamt / Offen / Aktiv / Erledigt in Echtzeit |
| **Priorisierte Listenansicht** | Tickets werden nach Priorität (HIGH → MEDIUM → LOW) und Datum sortiert |

---

## Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser  │  React + TypeScript + Vite                          │
├───────────┼─────────────────────────────────────────────────────┤
│  API      │  FastAPI · REST · Pydantic v2 · OpenAPI/Swagger     │
├───────────┼─────────────────────────────────────────────────────┤
│  App      │  TicketLifecycleService · BillingService            │
├───────────┼─────────────────────────────────────────────────────┤
│  Domain   │  Dataclass-Entities · Statusmaschine · Exceptions   │
├───────────┼─────────────────────────────────────────────────────┤
│  Infra    │  SQLAlchemy 2 · Alembic · Repository-Impls.         │
├───────────┼─────────────────────────────────────────────────────┤
│  DB       │  PostgreSQL (Prod) · SQLite (Dev / Tests)           │
└─────────────────────────────────────────────────────────────────┘
```

**Schichtenprinzip:** Abhängigkeiten zeigen nur nach innen — Domain kennt niemanden, Infrastructure kennt alle.
Repository-Interfaces als Python `Protocol` garantieren Testbarkeit ohne Mock-Framework.

Weiterführende Dokumentation:

| Dokument | Inhalt |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Schichtendiagramm, ADRs |
| [docs/scrum.md](docs/scrum.md) | Product Backlog, Sprints, Definition of Done |
| [docs/tdd.md](docs/tdd.md) | Red-Green-Refactor-Nachweis |
| [AGENTS.md](AGENTS.md) | WHY/WHAT/HOW, LLM-Auswahl, AI-Einsatz |

---

## Tech Stack

| Schicht | Technologie |
|---|---|
| Backend API | Python 3.12 · FastAPI 0.109+ · uvicorn |
| ORM / Migrationen | SQLAlchemy 2 · Alembic |
| Datenbank | PostgreSQL (Prod) · SQLite (Dev/Test) |
| Validierung | Pydantic v2 — `EmailStr`, `Decimal`, `Field` |
| Frontend | React 18 · TypeScript 5 · Vite |
| Styling | CSS Custom Properties · Glassmorphism · Animationen |
| Lokalisierung | Eigenes Context-basiertes i18n (typsichere Keys, kein externes Paket) |
| Containerisierung | Docker (multi-stage) · docker-compose |
| CI/CD | GitHub Actions — parallele Backend/Frontend-Jobs |
| Deployment | Render.com via `render.yaml` |
| Code-Qualität | ruff · black · mypy · tsc · Playwright E2E |

---

## Schnellstart

```bash
# Vollständiges Setup (Backend + Frontend + PostgreSQL)
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |

---

## Lokales Setup ohne Docker

```bash
# Backend (aus Projekt-Root)
pip install -r backend/requirements.txt
cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend (aus Projekt-Root, separates Terminal)
cd frontend && npm install && npm run dev
```

> Beim ersten Start wird automatisch eine SQLite-Datenbank angelegt und mit Demo-Daten befüllt.

---

## API-Referenz

| Methode | Endpunkt | Beschreibung |
|---|---|---|
| `POST` | `/api/properties/` | Property anlegen |
| `POST` | `/api/units/` | Einheit anlegen |
| `POST` | `/api/tenants/` | Mieter erfassen |
| `POST` | `/api/technicians/` | Techniker erfassen |
| `POST` | `/api/tickets/` | Ticket erstellen → Status `OPEN`, Priorität wird automatisch inferiert |
| `GET` | `/api/tickets/` | Alle Tickets (`?status=OPEN`) |
| `GET` | `/api/tickets/{id}` | Einzelnes Ticket |
| `PATCH` | `/api/tickets/{id}/auto-assign` | KI-basierte Techniker-Zuweisung → `ASSIGNED` |
| `PATCH` | `/api/tickets/{id}/assign` | Manuelle Techniker-Zuweisung → `ASSIGNED` |
| `PATCH` | `/api/tickets/{id}/start` | Arbeit starten → `IN_PROGRESS` |
| `PATCH` | `/api/tickets/{id}/resolve` | Abschliessen → `RESOLVED` |
| `PATCH` | `/api/tickets/{id}/close` | Archivieren → `CLOSED` |
| `POST` | `/api/tickets/{id}/invoice` | Rechnung erstellen (nur `RESOLVED`/`CLOSED`) |
| `GET` | `/api/tickets/{id}/invoice` | Rechnung abrufen |
| `PATCH` | `/api/invoices/{id}/pay` | Rechnung bezahlen |

Vollständige interaktive Dokumentation: **http://localhost:8000/docs** (Swagger UI)

---

## Tests

```bash
# Unit-Tests — kein I/O, blitzschnell (In-Memory-Repos)
cd backend && pytest tests/unit -v

# Integrationstests — SQLite in-memory, echter HTTP-Stack
cd backend && pytest tests/integration -v

# Coverage-Report
cd backend && pytest --cov=app --cov-report=term-missing

# E2E — Playwright (Backend + Frontend müssen laufen)
cd frontend && npx playwright test
```

**Testing-Pyramid:** Unit → Integration → E2E. Business-Regeln ausschliesslich in Unit-Tests.
Alle Fehler-Pfade (422 Statusübergang, 400 Duplikat-Invoice, 404 Not Found) sind explizit getestet.

---

## CI/CD Pipeline

```
Push / PR auf main
       │
       ├─── backend job ─────────────────────────────────────────────┐
       │     ruff lint → mypy typecheck → pytest unit → pytest integ │
       │                                                              ├── beide parallel
       └─── frontend job ──────────────────────────────────────────┐ │
             npm install → tsc --noEmit → npm run build            ─┘─┘

Git-Tag v* → Tests → Docker build (Backend + Frontend) → GitHub Release
```

| Workflow | Datei | Trigger |
|---|---|---|
| CI | `.github/workflows/ci.yml` | Push / PR auf `main` |
| Release | `.github/workflows/release.yml` | Git-Tag `v*` |

---

## Cloud-Deployment

Render-ready: [`render.yaml`](render.yaml) konfiguriert automatisch:
- FastAPI Backend als Web Service (Python, oregon region)
- PostgreSQL Managed Database (`spms`)
- `DATABASE_URL` via `fromDatabase.connectionString` (kein Hardcode)
- `CORS_ORIGINS` für Frontend-Domain

---

## AI-Assisted Development

Dieses Projekt wurde mit **Claude Code** (AI-Coding-Agent) entwickelt.
Vollständige Dokumentation in [`AGENTS.md`](AGENTS.md):

- WHY / WHAT / HOW Struktur für Agenten-Instruktionen
- LLM-Vergleich: Claude Code vs. Copilot vs. Cursor vs. Windsurf vs. ChatGPT
- 6 Prompt-Beispiele mit AI-Output und manuellen Korrekturen
- Identifizierte Bugs in generiertem Code und deren Fixes

Die zwei zentralen KI-Features entstanden durch Spec-driven Development:

**Automatische Prioritätserkennung** (`infer_priority` im Domain-Layer):
```python
HIGH_PRIORITY_KEYWORDS = {"notfall", "wasser", "strom", "heizung", "brand", ...}
LOW_PRIORITY_KEYWORDS  = {"routine", "wartung", "kosmetisch", ...}

def infer_priority(title: str, description: str) -> TicketPriority:
    words = set(f"{title} {description}".lower().split())
    if words & HIGH_PRIORITY_KEYWORDS: return TicketPriority.HIGH
    if words & LOW_PRIORITY_KEYWORDS:  return TicketPriority.LOW
    return TicketPriority.MEDIUM
```

**Intelligente Techniker-Zuweisung** (Scoring im Application-Layer):
```python
def score(tech: Technician) -> int:
    return sum(
        2 if kw in text.split() else (1 if kw[:4] in text else 0)
        for kw in tech.expertise.lower().split()
    )
best = max(technicians, key=score)
```

---

## Demo-Flow

1. **Frontend öffnen** → `http://localhost:5173`
2. **Sprache wählen** → oben rechts zwischen 🇩🇪 DE und 🇬🇧 EN wechseln — die gesamte UI schaltet um
3. **Ticket anlegen** — Titel und Beschreibung eingeben; Priorität wird automatisch erkannt (oder manuell übersteuert)
4. **Ticket auswählen** → Lifecycle-Stepper zeigt den aktuellen Status visuell
5. **Auto-Zuweisung** → "Automatisch zuweisen" klicken — das System wählt den besten Techniker per Keyword-Scoring
6. **Oder manuelle Zuweisung** → Techniker aus Dropdown wählen und bestätigen
7. **Arbeit starten → Als erledigt markieren**
8. **Rechnung erstellen** (Betrag eingeben) → Bezahlen → Ticket schliessen
9. **Negativ-Demo:** Ticket direkt von OPEN auf IN_PROGRESS starten → Error-Toast zeigt HTTP 422

---

## Bekannte Limitationen

| Limitation | Begründung |
|---|---|
| Keine Benutzer-Authentifizierung | Bewusste Scope-Entscheidung (dokumentiert in `docs/scrum.md`) |
| Kein Realtime-Update (WebSocket) | Über Polling lösbar, ausserhalb Projektscope |
| Keyword-Matching ohne ML-Modell | `infer_priority` ist regelbasiert — ausreichend für den Use Case, skalierbar auf NLP |

## Erweiterungsmöglichkeiten

- JWT-basierte Rollenauthentifizierung (Verwalter / Techniker / Mieter)
- WebSocket-Echtzeitbenachrichtigungen
- NLP-basierte Prioritätserkennung (Hugging Face Transformers)
- Anhänge und Kommentarhistorie pro Ticket
- E-Mail-Benachrichtigungen via Webhook
- Vollständige Property/Tenant-Verwaltung im Frontend
