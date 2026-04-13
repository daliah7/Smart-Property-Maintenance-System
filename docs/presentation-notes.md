# Präsentationsnotizen – Smart Property Maintenance System

Strukturiert nach den 7 Bewertungskategorien.

---

## 1. Problem & Use Case

**Was ist das Problem?**
Hausverwaltungen verwalten Wartungsanfragen heute per E-Mail, WhatsApp oder Papierformular.
Ergebnis: Aufgaben fallen durch, Techniker werden doppelt gebucht, Abrechnungen entstehen verzögert oder gar nicht.

**Was löst das System?**
Ein strukturierter Ticket-Lifecycle von der Meldung bis zur Rechnungsstellung:
- Mieter meldet einen Schaden → Ticket wird erstellt
- Hausverwaltung weist einen Techniker zu
- Techniker startet und schließt die Arbeit
- Rechnung wird automatisch erst nach Arbeitsabschluss freigegeben
- Zahlung wird dokumentiert

**Präsentationssatz:**
> "Dieses System ersetzt manuelle Kommunikationsketten in der Hausverwaltung durch einen klar definierten, nachvollziehbaren Ticket-Prozess – von der Schadensmeldung bis zur Rechnungsstellung."

---

## 2. Architektur & Design

**Was wurde gebaut?**
- Saubere 4-Schichten-Architektur: Domain → Application → Interface (API) → Infrastructure
- Klare Abhängigkeitsrichtung: nur einwärts, nie aufwärts
- Repository-Pattern mit Python `Protocol`-Interfaces: kein ORM im Domain- oder Application-Layer
- Separierte ORM-Modelle in der Infrastructure-Schicht mit expliziten Mapping-Funktionen

**Zeigbare Stärken:**
- [domain/models.py](../backend/app/domain/models.py): Business-Regeln ausschliesslich im Domain-Objekt
- [application/repositories.py](../backend/app/application/repositories.py): Protocol-Interfaces ohne Datenbankabhängigkeit
- [docs/architecture.md](architecture.md): ASCII-Diagramm und 4 ADRs mit Begründungen

**Präsentationssatz:**
> "Die Architektur ist so aufgebaut, dass die gesamte Geschäftslogik ohne Datenbank, ohne Framework und ohne Mocks testbar ist – das ist kein Zufall, sondern eine bewusste Architekturentscheidung."

---

## 3. Business-Logik & Domänenmodell

**Was sind die Kernregeln?**

1. **Statusmaschine**: OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED. Jeder illegale Sprung (z.B. OPEN → IN_PROGRESS) wirft `InvalidStatusTransitionError` → HTTP 422.
2. **Tenant-Unit-Konsistenz**: Ein Ticket kann nur für eine Unit erstellt werden, in der der angegebene Mieter tatsächlich registriert ist.
3. **Invoice-Gate**: Rechnung kann nur für ein RESOLVED-Ticket erstellt werden.
4. **Duplikat-Schutz**: Pro Ticket maximal eine Rechnung.
5. **Idempotenz**: Eine bereits bezahlte Rechnung kann nicht nochmals bezahlt werden.

**Zeigbarer Code:**
- `MaintenanceTicket._transition_status()` – Statusmaschine
- `BillingService.create_invoice()` – Invoice-Gate + Duplikat-Check
- `Invoice.mark_paid()` – Idempotenz-Schutz

**Präsentationssatz:**
> "Alle fünf Geschäftsregeln sind im Domain-Layer codiert und nicht in Controllers oder Datenbankabfragen versteckt – das macht sie überprüfbar, testbar und wartbar."

---

## 4. Testing & Qualitätssicherung

**Was wurde getestet?**

| Ebene | Datei | Abdeckung |
|---|---|---|
| Unit | `tests/unit/test_application.py` | Happy Path + 3 Negativ-Szenarien |
| Integration | `tests/integration/test_api.py` | Vollständiger API-Flow + 3 Fehlerfälle |
| E2E | `tests/e2e/tests/ticket-workflow.spec.ts` | Demo-Flow im Browser (Playwright) |

**Negativ-Tests (nach Review ergänzt):**
- `test_invalid_status_transition_raises_error`: OPEN → IN_PROGRESS muss fehlschlagen
- `test_billing_service_prevents_duplicate_invoice`: zweite Invoice muss abgelehnt werden
- `test_pay_already_paid_invoice_raises_error`: doppelte Bezahlung muss fehlschlagen
- `test_invalid_status_transition_returns_422`: API gibt 422, nicht 500
- `test_duplicate_invoice_returns_400`: API gibt 400
- `test_ticket_not_found_returns_404`: API gibt 404

**Präsentationssatz:**
> "Die Testpyramide deckt alle Schichten ab – Unit-Tests beweisen die Business-Logik ohne Datenbank, Integrationstests validieren den API-Vertrag, und E2E-Tests bestätigen den vollständigen Demo-Flow im Browser."

---

## 5. AI-assisted Development & Tooling

**Was wurde mit AI gemacht?**
- Projektstruktur und Schichtenarchitektur entworfen
- Repository-Protocol-Interfaces generiert
- CI/CD-Workflows als Ausgangsbasis erstellt
- Testfallstruktur vorgeschlagen
- Dockerfiles und docker-compose erstellt

**Was wurde manuell korrigiert?**
- `update()`-Methode im `InvoiceRepository`-Protocol fehlte → ergänzt
- `InvalidStatusTransitionError` war in API-Endpoints nicht abgefangen → HTTP 500-Bug behoben
- CI-Jobs liefen sequenziell statt parallel → parallelisiert
- Negativ-Testfälle fehlten vollständig → manuell geschrieben
- `mypy` und `tsc --noEmit` Type-Checks nicht im CI → ergänzt

**Präsentationssatz:**
> "AI hat Struktur und Boilerplate erheblich beschleunigt – aber drei konkrete Bugs und fehlende Testfälle wurden erst durch menschliches Code-Review entdeckt. Das zeigt: AI ist ein Werkzeug, kein Ersatz für Urteilsvermögen."

---

## 6. CI / Release / CD & Deployment

**Was ist konfiguriert?**

| Workflow | Trigger | Was passiert |
|---|---|---|
| `ci.yml` | Push/PR auf main | Backend (lint + mypy + tests) und Frontend (tsc + build) **parallel** |
| `release.yml` | Git-Tag `v*` | Tests + Docker-Build + GitHub Release automatisch erstellt |
| `deploy.yml` | Manuell | Deployment-Validierung vor Render-Deploy |

**Deployment-Ziel:** Render.com mit `render.yaml` (PostgreSQL-konfiguriert, `DATABASE_URL` als Env-Variable).

**Präsentationssatz:**
> "Mit einem Git-Tag `v1.0.0` laufen automatisch Tests, Docker-Builds und die GitHub-Release-Erstellung – das ist ein echter Release-Prozess, kein manuelles Klicken."

---

## 7. Dokumentation & Präsentation

**Was ist dokumentiert?**

| Dokument | Inhalt |
|---|---|
| `README.md` | Problem, Setup, API-Endpunkte, Demo-Flow |
| `docs/architecture.md` | ASCII-Diagramm, Schichtenmodell, Statusmaschine, 4 ADRs |
| `AGENTS.md` | 6 konkrete AI-Einsatzbeispiele mit Prompts und Korrekturen |
| `docs/presentation-notes.md` | Diese Datei – Präsentationsvorbereitung |
| Swagger UI | Auto-generiert unter `/docs` – vollständige API-Dokumentation |

**Präsentationssatz:**
> "Die Architektur-Dokumentation enthält nicht nur ein Diagramm, sondern vier begründete Architecture Decision Records – damit ist nachvollziehbar, warum Entscheidungen so getroffen wurden, nicht nur was implementiert wurde."

---

## Demo-Ablauf (5 Minuten)

1. `docker compose up --build` zeigen → System startet
2. Swagger UI öffnen: `http://localhost:8000/docs`
3. Frontend öffnen: `http://localhost:5173`
4. Ticket erstellen → Techniker zuweisen → starten → lösen
5. Rechnung erstellen → bezahlen
6. Negativ-Demo: Versuche Ticket direkt von OPEN auf IN_PROGRESS zu setzen → HTTP 422

## Bekannte Limitationen (ehrlich kommunizieren)

- Keine Authentifizierung/Autorisierung (bewusste Scope-Entscheidung für Capstone)
- UI ist funktional, kein Designsystem (Fokus lag auf Architektur und Backend)
- Ticket-Erstellung erfordert manuelle ID-Eingabe (kein Dropdown für Unit/Tenant)
