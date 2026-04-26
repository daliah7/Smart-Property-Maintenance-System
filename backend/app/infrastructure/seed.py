from datetime import datetime, timedelta, timezone
from decimal import Decimal

from app.infrastructure.database import SessionLocal
from app.infrastructure.models import (
    InvoiceModel,
    MaintenanceTicketModel,
    PropertyModel,
    TenantModel,
    TechnicianModel,
    TicketHistoryModel,
    UnitModel,
)

NOW = datetime.now(timezone.utc)


def _ago(**kwargs) -> datetime:
    return NOW - timedelta(**kwargs)


def _patch_seed_data(session) -> None:
    """Top-up older DB snapshots with missing technicians, invoices and fixed timestamps."""
    from sqlalchemy import update  # local import avoids circular import at module level

    # 1. Add missing technicians (check by name)
    existing_names = {t.name for t in session.query(TechnicianModel).all()}
    candidates = [
        TechnicianModel(name="Luka Novak",        expertise="Elektrik Strom Kurzschluss Elektroinstallation Sicherung"),
        TechnicianModel(name="Ivan Horvat",        expertise="Sanitär Heizung Wasser Rohrbruch Wasserrohrbruch Warmwasser"),
        TechnicianModel(name="Fabien Dupont",      expertise="Schlosserei Türen Fenster Schloss Scharnier Einbruch"),
        TechnicianModel(name="Marco Bianchi",      expertise="Allgemein Maler Wände Fliesen Renovierung Anstrich"),
        TechnicianModel(name="Tobias Keller",      expertise="Klimaanlage Lüftung Klimatechnik Belüftung Kühlung Ventilation"),
        TechnicianModel(name="Marko Kovač",        expertise="Dach Dachdecker Abdichtung Dachrinne Dachschaden Undicht"),
        TechnicianModel(name="Stéphane Laurent",   expertise="Garten Aussenanlagen Grünfläche Baum Hecke Gehweg Pflaster"),
        TechnicianModel(name="Reto Amstutz",       expertise="Aufzug Lift Elevator Aufzugswartung Aufzugsanlage"),
        TechnicianModel(name="Lorenzo Russo",      expertise="Solar Photovoltaik Solaranlage Solarpanel Energie Strom"),
        TechnicianModel(name="Carlos Ibáñez",      expertise="Maler Farbe Anstrich Tapete Putz Fassade Lackierung"),
        TechnicianModel(name="Yves Crettenand",    expertise="Boden Parkett Laminat Fliesen Estrich Teppich Bodenbelag"),
        TechnicianModel(name="Chiara Bernasconi",  expertise="IT Netzwerk Internet WLAN Kabel EDV Haustechnik Smarthome"),
        TechnicianModel(name="Dominik Frei",       expertise="Brandschutz Feuermelder Sprinkler Feuerlöscher Sicherheit Brand"),
        TechnicianModel(name="Miguel Delgado",     expertise="Storen Jalousie Rolladen Sonnenschutz Markise Beschattung"),
        TechnicianModel(name="Hannes Lüthi",       expertise="Schreiner Holz Möbel Einbauschrank Treppe Parkett Holzarbeiten"),
        TechnicianModel(name="Pierre Maillard",    expertise="Sanitärinstallation Wasserleitung Abfluss Rohr Kanalisation Ventil"),
        TechnicianModel(name="Giorgio Ferretti",   expertise="Maurer Beton Mauerwerk Risse Abdichtung Keller Fundament"),
        TechnicianModel(name="Nicole Amstutz",     expertise="Haustechnik Gebäudetechnik Steuerung Automation Pumpe Regelung"),
        TechnicianModel(name="Alexei Volkov",      expertise="Garage Garagentor Tiefgarage Schranke Parkhaus Tor Motor"),
        TechnicianModel(name="Dino Ferrari",       expertise="Reinigung Hausreinigung Treppenhausreinigung Desinfektion Pflege"),
    ]
    added = [c for c in candidates if c.name not in existing_names]
    if added:
        session.add_all(added)
        session.flush()

    # 2. Fix updated_at for RESOLVED/CLOSED tickets that have updated_at == created_at
    for ticket in session.query(MaintenanceTicketModel).filter(
        MaintenanceTicketModel.status.in_(["RESOLVED", "CLOSED"])
    ).all():
        if abs((ticket.updated_at - ticket.created_at).total_seconds()) < 60:
            # Give realistic resolution times based on priority
            hours = {"HIGH": 48, "MEDIUM": 72, "LOW": 168}.get(ticket.priority, 72)
            ticket.updated_at = ticket.created_at + timedelta(hours=hours)
    session.flush()

    # 3. Add more invoices if we only have the initial 2
    existing_invoice_count = session.query(InvoiceModel).count()
    if existing_invoice_count < 8:
        tickets_map = {t.title: t for t in session.query(MaintenanceTicketModel).all()}
        existing_ticket_ids = {inv.ticket_id for inv in session.query(InvoiceModel).all()}
        extra_invoices = []
        candidates_inv = [
            ("Türschloss defekt — Haupteingang",        Decimal("185.00"), True,  timedelta(days=151), timedelta(days=148)),
            ("Dachrinne verstopft — Wasserschaden droht", Decimal("320.00"), True, timedelta(days=99),  timedelta(days=96)),
            ("Lüftungsanlage defekt",                   Decimal("550.00"), False, timedelta(days=130), None),
            ("Rohrbruch im Badezimmer",                 Decimal("410.00"), True,  timedelta(days=115), timedelta(days=110)),
            ("Heizungsausfall im Wohnzimmer",           Decimal("240.00"), True,  timedelta(days=193), timedelta(days=190)),
            ("Stromausfall Küchensteckdose",            Decimal("160.00"), False, timedelta(days=160), None),
        ]
        for title, amount, paid, created_delta, paid_delta in candidates_inv:
            ticket = tickets_map.get(title)
            if ticket and ticket.id not in existing_ticket_ids:
                inv = InvoiceModel(
                    ticket_id=ticket.id, amount=amount, paid=paid,
                    created_at=NOW - created_delta,
                    paid_at=(NOW - paid_delta) if paid and paid_delta else None,
                )
                extra_invoices.append(inv)
                existing_ticket_ids.add(ticket.id)
        if extra_invoices:
            session.add_all(extra_invoices)
            session.flush()

    session.commit()


def seed_demo_data() -> None:
    with SessionLocal() as session:
        if session.query(PropertyModel).first() is not None:
            _patch_seed_data(session)
            return

        # ── Properties ──────────────────────────────────────────────────
        landmark = PropertyModel(name="Landmark Residences",      address="Rosenweg 14, 3007 Bern")
        riverside = PropertyModel(name="Riverside Campus",         address="Seeburgstrasse 12, 6006 Luzern")
        sunset = PropertyModel(name="Sunset Gardens",              address="Via Cortivo 8, 6976 Castagnola-Lugano")
        zuerichberg = PropertyModel(name="Zürichberg Residenz",    address="Zürichbergstrasse 55, 8044 Zürich")
        nidwalden = PropertyModel(name="Seepark Nidwalden",        address="Seestrasse 22, 6374 Buochs")
        rive_lac = PropertyModel(name="Rive du Lac",               address="Quai du Général-Guisan 34, 1204 Genève")
        lausanne = PropertyModel(name="Les Terrasses de Lausanne", address="Avenue de la Gare 12, 1003 Lausanne")
        session.add_all([landmark, riverside, sunset, zuerichberg, nidwalden, rive_lac, lausanne])
        session.flush()

        # ── Units ────────────────────────────────────────────────────────
        unit_a1 = UnitModel(property_id=landmark.id,     name="A1", floor="EG")
        unit_a2 = UnitModel(property_id=landmark.id,     name="A2", floor="EG")
        unit_a3 = UnitModel(property_id=landmark.id,     name="A3", floor="1. OG")
        unit_b1 = UnitModel(property_id=riverside.id,    name="B1", floor="1. OG")
        unit_b2 = UnitModel(property_id=riverside.id,    name="B2", floor="2. OG")
        unit_c1 = UnitModel(property_id=sunset.id,       name="C1", floor="EG")
        unit_c2 = UnitModel(property_id=sunset.id,       name="C2", floor="1. OG")
        unit_c3 = UnitModel(property_id=sunset.id,       name="C3", floor="2. OG")
        unit_d1 = UnitModel(property_id=zuerichberg.id,  name="D1", floor="1. OG")
        unit_d2 = UnitModel(property_id=zuerichberg.id,  name="D2", floor="2. OG")
        unit_d3 = UnitModel(property_id=zuerichberg.id,  name="D3", floor="Penthouse")
        unit_e1 = UnitModel(property_id=nidwalden.id,    name="E1", floor="EG")
        unit_e2 = UnitModel(property_id=nidwalden.id,    name="E2", floor="1. OG")
        unit_f1 = UnitModel(property_id=rive_lac.id,     name="F1", floor="EG")
        unit_f2 = UnitModel(property_id=rive_lac.id,     name="F2", floor="1. OG")
        unit_f3 = UnitModel(property_id=rive_lac.id,     name="F3", floor="2. OG")
        unit_g1 = UnitModel(property_id=lausanne.id,     name="G1", floor="EG")
        unit_g2 = UnitModel(property_id=lausanne.id,     name="G2", floor="1. OG")
        unit_g3 = UnitModel(property_id=lausanne.id,     name="G3", floor="2. OG")
        session.add_all([
            unit_a1, unit_a2, unit_a3, unit_b1, unit_b2, unit_c1, unit_c2, unit_c3,
            unit_d1, unit_d2, unit_d3, unit_e1, unit_e2, unit_f1, unit_f2, unit_f3,
            unit_g1, unit_g2, unit_g3,
        ])
        session.flush()

        # ── Tenants ──────────────────────────────────────────────────────
        tenant_a1 = TenantModel(name="Mia Grün",           email="mia.gruen@example.com",          unit_id=unit_a1.id)
        tenant_a2 = TenantModel(name="Jonas Weber",         email="jonas.weber@example.com",         unit_id=unit_a2.id)
        tenant_a3 = TenantModel(name="Lena Fischer",        email="lena.fischer@example.com",        unit_id=unit_a3.id)
        tenant_b1 = TenantModel(name="Sara Klein",          email="sara.klein@example.com",          unit_id=unit_b1.id)
        tenant_b2 = TenantModel(name="Felix Braun",         email="felix.braun@example.com",         unit_id=unit_b2.id)
        tenant_c1 = TenantModel(name="Sophie Müller",       email="sophie.mueller@example.com",      unit_id=unit_c1.id)
        tenant_c2 = TenantModel(name="David Schneider",     email="david.schneider@example.com",     unit_id=unit_c2.id)
        tenant_c3 = TenantModel(name="Anna Bauer",          email="anna.bauer@example.com",          unit_id=unit_c3.id)
        tenant_d1 = TenantModel(name="Lukas Meier",         email="lukas.meier@example.com",         unit_id=unit_d1.id)
        tenant_d2 = TenantModel(name="Nina Keller",         email="nina.keller@example.com",         unit_id=unit_d2.id)
        tenant_d3 = TenantModel(name="Pascal Zimmermann",   email="pascal.zimmermann@example.com",   unit_id=unit_d3.id)
        tenant_e1 = TenantModel(name="Ursula Gamma",        email="ursula.gamma@example.com",        unit_id=unit_e1.id)
        tenant_e2 = TenantModel(name="Bruno Kälin",         email="bruno.kaelin@example.com",        unit_id=unit_e2.id)
        tenant_f1 = TenantModel(name="Céline Dupont",       email="celine.dupont@example.com",       unit_id=unit_f1.id)
        tenant_f2 = TenantModel(name="Marc Fontaine",       email="marc.fontaine@example.com",       unit_id=unit_f2.id)
        tenant_f3 = TenantModel(name="Isabelle Rochat",     email="isabelle.rochat@example.com",     unit_id=unit_f3.id)
        tenant_g1 = TenantModel(name="Nathalie Vidal",      email="nathalie.vidal@example.com",      unit_id=unit_g1.id)
        tenant_g2 = TenantModel(name="Olivier Chevalier",   email="olivier.chevalier@example.com",   unit_id=unit_g2.id)
        tenant_g3 = TenantModel(name="Camille Morel",       email="camille.morel@example.com",       unit_id=unit_g3.id)
        session.add_all([
            tenant_a1, tenant_a2, tenant_a3, tenant_b1, tenant_b2,
            tenant_c1, tenant_c2, tenant_c3, tenant_d1, tenant_d2, tenant_d3,
            tenant_e1, tenant_e2, tenant_f1, tenant_f2, tenant_f3,
            tenant_g1, tenant_g2, tenant_g3,
        ])
        session.flush()

        # ── Technicians ──────────────────────────────────────────────────
        tech_elektro    = TechnicianModel(name="Luka Novak",        expertise="Elektrik Strom Kurzschluss Elektroinstallation Sicherung")
        tech_sanitaer   = TechnicianModel(name="Ivan Horvat",       expertise="Sanitär Heizung Wasser Rohrbruch Wasserrohrbruch Warmwasser")
        tech_schlosser  = TechnicianModel(name="Fabien Dupont",     expertise="Schlosserei Türen Fenster Schloss Scharnier Einbruch")
        tech_allgemein  = TechnicianModel(name="Marco Bianchi",     expertise="Allgemein Maler Wände Fliesen Renovierung Anstrich")
        tech_klima      = TechnicianModel(name="Tobias Keller",     expertise="Klimaanlage Lüftung Klimatechnik Belüftung Kühlung Ventilation")
        tech_dach       = TechnicianModel(name="Marko Kovač",       expertise="Dach Dachdecker Abdichtung Dachrinne Dachschaden Undicht")
        tech_garten     = TechnicianModel(name="Stéphane Laurent",  expertise="Garten Aussenanlagen Grünfläche Baum Hecke Gehweg Pflaster")
        tech_aufzug     = TechnicianModel(name="Reto Amstutz",      expertise="Aufzug Lift Elevator Aufzugswartung Aufzugsanlage")
        tech_solar      = TechnicianModel(name="Lorenzo Russo",     expertise="Solar Photovoltaik Solaranlage Solarpanel Energie Strom")
        tech_maler      = TechnicianModel(name="Carlos Ibáñez",     expertise="Maler Farbe Anstrich Tapete Putz Fassade Lackierung")
        tech_boden      = TechnicianModel(name="Yves Crettenand",   expertise="Boden Parkett Laminat Fliesen Estrich Teppich Bodenbelag")
        tech_it         = TechnicianModel(name="Chiara Bernasconi", expertise="IT Netzwerk Internet WLAN Kabel EDV Haustechnik Smarthome")
        tech_brand      = TechnicianModel(name="Dominik Frei",      expertise="Brandschutz Feuermelder Sprinkler Feuerlöscher Sicherheit Brand")
        tech_storen     = TechnicianModel(name="Miguel Delgado",    expertise="Storen Jalousie Rolladen Sonnenschutz Markise Beschattung")
        tech_schreiner  = TechnicianModel(name="Hannes Lüthi",      expertise="Schreiner Holz Möbel Einbauschrank Treppe Parkett Holzarbeiten")
        tech_installat  = TechnicianModel(name="Pierre Maillard",   expertise="Sanitärinstallation Wasserleitung Abfluss Rohr Kanalisation Ventil")
        tech_maurer     = TechnicianModel(name="Giorgio Ferretti",  expertise="Maurer Beton Mauerwerk Risse Abdichtung Keller Fundament")
        tech_haustechnik= TechnicianModel(name="Nicole Amstutz",    expertise="Haustechnik Gebäudetechnik Steuerung Automation Pumpe Regelung")
        tech_garagen    = TechnicianModel(name="Alexei Volkov",     expertise="Garage Garagentor Tiefgarage Schranke Parkhaus Tor Motor")
        tech_reinigung  = TechnicianModel(name="Dino Ferrari",      expertise="Reinigung Hausreinigung Treppenhausreinigung Desinfektion Pflege")
        session.add_all([
            tech_elektro, tech_sanitaer, tech_schlosser, tech_allgemein, tech_klima,
            tech_dach, tech_garten, tech_aufzug, tech_solar, tech_maler, tech_boden,
            tech_it, tech_brand, tech_storen, tech_schreiner, tech_installat,
            tech_maurer, tech_haustechnik, tech_garagen, tech_reinigung,
        ])
        session.flush()

        # ── Tickets (with realistic date spread over 6 months) ───────────
        # Landmark Residences — Bern
        ticket_1 = MaintenanceTicketModel(
            title="Heizungsausfall im Wohnzimmer",
            description="Die Heizung heizt seit gestern Abend nicht mehr. Notfall da Aussentemperatur -5°C.",
            unit_id=unit_a1.id, tenant_id=tenant_a1.id,
            technician_id=tech_sanitaer.id, status="RESOLVED", priority="HIGH",
            created_at=_ago(days=195), updated_at=_ago(days=193),
        )
        ticket_2 = MaintenanceTicketModel(
            title="Fenster klemmt — Schlafzimmer",
            description="Das Schlafzimmerfenster lässt sich nicht mehr öffnen.",
            unit_id=unit_a2.id, tenant_id=tenant_a2.id,
            status="OPEN", priority="MEDIUM",
            created_at=_ago(days=72), updated_at=_ago(days=72),
        )
        ticket_3 = MaintenanceTicketModel(
            title="Sicherung springt dauernd raus",
            description="Die Sicherung für Zimmer 2 fliegt mehrmals täglich raus. Elektrik prüfen.",
            unit_id=unit_a3.id, tenant_id=tenant_a3.id,
            status="OPEN", priority="HIGH",
            created_at=_ago(days=65), updated_at=_ago(days=65),
        )
        # Riverside Campus — Luzern
        ticket_4 = MaintenanceTicketModel(
            title="Stromausfall Küchensteckdose",
            description="Die Steckdose in der Küche liefert keinen Strom mehr. Kurzschluss vermutlich.",
            unit_id=unit_b1.id, tenant_id=tenant_b1.id,
            technician_id=tech_elektro.id, status="IN_PROGRESS", priority="HIGH",
            created_at=_ago(days=164), updated_at=_ago(days=162),
        )
        ticket_5 = MaintenanceTicketModel(
            title="Routinewartung Heizungsanlage",
            description="Jährliche Inspektion und Wartung der Zentralheizung.",
            unit_id=unit_b2.id, tenant_id=tenant_b2.id,
            status="OPEN", priority="LOW",
            created_at=_ago(days=44), updated_at=_ago(days=44),
        )
        # Sunset Gardens — Lugano
        ticket_6 = MaintenanceTicketModel(
            title="Klimaanlage kühlt nicht mehr",
            description="Die Klimaanlage im Schlafzimmer läuft, produziert aber keine Kühlung mehr.",
            unit_id=unit_c1.id, tenant_id=tenant_c1.id,
            status="OPEN", priority="MEDIUM",
            created_at=_ago(days=40), updated_at=_ago(days=40),
        )
        ticket_7 = MaintenanceTicketModel(
            title="Dachrinne verstopft — Wasserschaden droht",
            description="Die Dachrinne ist vollständig verstopft, bei Regen läuft Wasser die Fassade runter.",
            unit_id=unit_c2.id, tenant_id=tenant_c2.id,
            technician_id=tech_dach.id, status="ASSIGNED", priority="HIGH",
            created_at=_ago(days=103), updated_at=_ago(days=101),
        )
        ticket_8 = MaintenanceTicketModel(
            title="Türschloss defekt — Haupteingang",
            description="Das Türschloss am Haupteingang klemmt. Einbruchgefahr.",
            unit_id=unit_c3.id, tenant_id=tenant_c3.id,
            technician_id=tech_schlosser.id, status="IN_PROGRESS", priority="HIGH",
            created_at=_ago(days=155), updated_at=_ago(days=153),
        )
        # Zürichberg Residenz
        ticket_9 = MaintenanceTicketModel(
            title="Aufzug ausser Betrieb",
            description="Der Aufzug bleibt zwischen EG und 1. OG stecken. Dringend reparieren.",
            unit_id=unit_d1.id, tenant_id=tenant_d1.id,
            status="OPEN", priority="HIGH",
            created_at=_ago(days=35), updated_at=_ago(days=35),
        )
        ticket_10 = MaintenanceTicketModel(
            title="Wasserhahn tropft im Bad",
            description="Der Wasserhahn im Badezimmer tropft dauerhaft — hoher Wasserverbrauch.",
            unit_id=unit_d2.id, tenant_id=tenant_d2.id,
            technician_id=tech_sanitaer.id, status="ASSIGNED", priority="MEDIUM",
            created_at=_ago(days=90), updated_at=_ago(days=88),
        )
        ticket_11 = MaintenanceTicketModel(
            title="Wandfarbe abgeblättert — Flur",
            description="Im Eingangsflur blättert die Farbe grossflächig ab, Renovation nötig.",
            unit_id=unit_d3.id, tenant_id=tenant_d3.id,
            technician_id=tech_allgemein.id, status="CLOSED", priority="LOW",
            created_at=_ago(days=185), updated_at=_ago(days=178),
        )
        # Seepark Nidwalden
        ticket_12 = MaintenanceTicketModel(
            title="Kein warmes Wasser seit 2 Tagen",
            description="Warmwasser funktioniert nicht. Dringend, da Kleinkind im Haushalt.",
            unit_id=unit_e1.id, tenant_id=tenant_e1.id,
            status="OPEN", priority="HIGH",
            created_at=_ago(days=10), updated_at=_ago(days=10),
        )
        ticket_13 = MaintenanceTicketModel(
            title="Gehwegplatten locker — Sturzgefahr",
            description="Mehrere Gehwegplatten vor dem Seeeingang sind locker. Sturzgefahr.",
            unit_id=unit_e2.id, tenant_id=tenant_e2.id,
            technician_id=tech_garten.id, status="ASSIGNED", priority="MEDIUM",
            created_at=_ago(days=80), updated_at=_ago(days=78),
        )
        # Rive du Lac — Genf
        ticket_14 = MaintenanceTicketModel(
            title="Feuchtigkeitsschaden im Keller",
            description="Nach dem Regen dringt Wasser durch die Kellerwand. Schimmelgefahr.",
            unit_id=unit_f1.id, tenant_id=tenant_f1.id,
            status="OPEN", priority="HIGH",
            created_at=_ago(days=7), updated_at=_ago(days=7),
        )
        ticket_15 = MaintenanceTicketModel(
            title="Lüftungsanlage defekt",
            description="Die zentrale Lüftung macht laute Geräusche und riecht verbrannt.",
            unit_id=unit_f2.id, tenant_id=tenant_f2.id,
            technician_id=tech_klima.id, status="IN_PROGRESS", priority="HIGH",
            created_at=_ago(days=134), updated_at=_ago(days=132),
        )
        ticket_16 = MaintenanceTicketModel(
            title="Balkongeländer locker",
            description="Das Geländer auf dem Balkon wackelt stark — Sicherheitsrisiko.",
            unit_id=unit_f3.id, tenant_id=tenant_f3.id,
            status="OPEN", priority="MEDIUM",
            created_at=_ago(days=3), updated_at=_ago(days=3),
        )
        # Les Terrasses de Lausanne
        ticket_17 = MaintenanceTicketModel(
            title="Rohrbruch im Badezimmer",
            description="Ein Rohr unter dem Waschbecken ist gebrochen, Wasser läuft auf den Boden.",
            unit_id=unit_g1.id, tenant_id=tenant_g1.id,
            technician_id=tech_sanitaer.id, status="IN_PROGRESS", priority="HIGH",
            created_at=_ago(days=120), updated_at=_ago(days=118),
        )
        ticket_18 = MaintenanceTicketModel(
            title="Storen (Jalousie) klemmt",
            description="Die elektrische Storen im Wohnzimmer lässt sich nicht mehr hochfahren.",
            unit_id=unit_g2.id, tenant_id=tenant_g2.id,
            status="OPEN", priority="MEDIUM",
            created_at=_ago(hours=18), updated_at=_ago(hours=18),
        )
        ticket_19 = MaintenanceTicketModel(
            title="Gartentor defekt — Schloss kaputt",
            description="Das Schloss am Gartentor ist gebrochen, Tor lässt sich nicht mehr schliessen.",
            unit_id=unit_g3.id, tenant_id=tenant_g3.id,
            technician_id=tech_schlosser.id, status="ASSIGNED", priority="MEDIUM",
            created_at=_ago(days=60), updated_at=_ago(days=58),
        )
        session.add_all([
            ticket_1, ticket_2, ticket_3, ticket_4, ticket_5, ticket_6,
            ticket_7, ticket_8, ticket_9, ticket_10, ticket_11, ticket_12,
            ticket_13, ticket_14, ticket_15, ticket_16, ticket_17, ticket_18, ticket_19,
        ])
        session.flush()

        # ── Invoices ─────────────────────────────────────────────────────
        invoice_1 = InvoiceModel(
            ticket_id=ticket_1.id, amount=Decimal("240.00"), paid=True,
            created_at=_ago(days=193), paid_at=_ago(days=190),
        )
        invoice_4 = InvoiceModel(
            ticket_id=ticket_4.id, amount=Decimal("320.00"), paid=False,
            created_at=_ago(days=160),
        )
        invoice_8 = InvoiceModel(
            ticket_id=ticket_8.id, amount=Decimal("185.00"), paid=True,
            created_at=_ago(days=151), paid_at=_ago(days=148),
        )
        invoice_11 = InvoiceModel(
            ticket_id=ticket_11.id, amount=Decimal("180.00"), paid=True,
            created_at=_ago(days=178), paid_at=_ago(days=174),
        )
        invoice_15 = InvoiceModel(
            ticket_id=ticket_15.id, amount=Decimal("550.00"), paid=False,
            created_at=_ago(days=130),
        )
        invoice_17 = InvoiceModel(
            ticket_id=ticket_17.id, amount=Decimal("410.00"), paid=True,
            created_at=_ago(days=115), paid_at=_ago(days=110),
        )
        session.add_all([invoice_1, invoice_4, invoice_8, invoice_11, invoice_15, invoice_17])
        session.flush()

        # ── Ticket History ────────────────────────────────────────────────
        history = [
            # ticket_1 — RESOLVED
            TicketHistoryModel(ticket_id=ticket_1.id, event="CREATED",  created_at=_ago(days=195)),
            TicketHistoryModel(ticket_id=ticket_1.id, event="ASSIGNED", note="Ivan Horvat zugewiesen", created_at=_ago(days=194, hours=2)),
            TicketHistoryModel(ticket_id=ticket_1.id, event="STARTED",  created_at=_ago(days=194)),
            TicketHistoryModel(ticket_id=ticket_1.id, event="RESOLVED", created_at=_ago(days=193)),
            # ticket_4 — IN_PROGRESS
            TicketHistoryModel(ticket_id=ticket_4.id, event="CREATED",  created_at=_ago(days=164)),
            TicketHistoryModel(ticket_id=ticket_4.id, event="ASSIGNED", note="Luka Novak zugewiesen", created_at=_ago(days=163)),
            TicketHistoryModel(ticket_id=ticket_4.id, event="STARTED",  created_at=_ago(days=162)),
            # ticket_7 — ASSIGNED
            TicketHistoryModel(ticket_id=ticket_7.id, event="CREATED",  created_at=_ago(days=103)),
            TicketHistoryModel(ticket_id=ticket_7.id, event="ASSIGNED", note="Marko Kovač zugewiesen", created_at=_ago(days=101)),
            # ticket_8 — IN_PROGRESS
            TicketHistoryModel(ticket_id=ticket_8.id, event="CREATED",  created_at=_ago(days=155)),
            TicketHistoryModel(ticket_id=ticket_8.id, event="ASSIGNED", note="Fabien Dupont zugewiesen", created_at=_ago(days=154)),
            TicketHistoryModel(ticket_id=ticket_8.id, event="STARTED",  created_at=_ago(days=153)),
            # ticket_10 — ASSIGNED
            TicketHistoryModel(ticket_id=ticket_10.id, event="CREATED",  created_at=_ago(days=90)),
            TicketHistoryModel(ticket_id=ticket_10.id, event="ASSIGNED", note="Ivan Horvat zugewiesen", created_at=_ago(days=88)),
            # ticket_11 — CLOSED
            TicketHistoryModel(ticket_id=ticket_11.id, event="CREATED",  created_at=_ago(days=185)),
            TicketHistoryModel(ticket_id=ticket_11.id, event="ASSIGNED", note="Marco Bianchi zugewiesen", created_at=_ago(days=184)),
            TicketHistoryModel(ticket_id=ticket_11.id, event="STARTED",  created_at=_ago(days=183)),
            TicketHistoryModel(ticket_id=ticket_11.id, event="RESOLVED", created_at=_ago(days=182)),
            TicketHistoryModel(ticket_id=ticket_11.id, event="CLOSED",   created_at=_ago(days=178)),
            # ticket_13 — ASSIGNED
            TicketHistoryModel(ticket_id=ticket_13.id, event="CREATED",  created_at=_ago(days=80)),
            TicketHistoryModel(ticket_id=ticket_13.id, event="ASSIGNED", note="Stéphane Laurent zugewiesen", created_at=_ago(days=78)),
            # ticket_15 — IN_PROGRESS
            TicketHistoryModel(ticket_id=ticket_15.id, event="CREATED",  created_at=_ago(days=134)),
            TicketHistoryModel(ticket_id=ticket_15.id, event="ASSIGNED", note="Tobias Keller zugewiesen", created_at=_ago(days=133)),
            TicketHistoryModel(ticket_id=ticket_15.id, event="STARTED",  created_at=_ago(days=132)),
            # ticket_17 — IN_PROGRESS
            TicketHistoryModel(ticket_id=ticket_17.id, event="CREATED",  created_at=_ago(days=120)),
            TicketHistoryModel(ticket_id=ticket_17.id, event="ASSIGNED", note="Ivan Horvat zugewiesen", created_at=_ago(days=119)),
            TicketHistoryModel(ticket_id=ticket_17.id, event="STARTED",  created_at=_ago(days=118)),
            # ticket_19 — ASSIGNED
            TicketHistoryModel(ticket_id=ticket_19.id, event="CREATED",  created_at=_ago(days=60)),
            TicketHistoryModel(ticket_id=ticket_19.id, event="ASSIGNED", note="Fabien Dupont zugewiesen", created_at=_ago(days=58)),
            # Open tickets — only CREATED
            TicketHistoryModel(ticket_id=ticket_2.id,  event="CREATED",  created_at=_ago(days=72)),
            TicketHistoryModel(ticket_id=ticket_3.id,  event="CREATED",  created_at=_ago(days=65)),
            TicketHistoryModel(ticket_id=ticket_5.id,  event="CREATED",  created_at=_ago(days=44)),
            TicketHistoryModel(ticket_id=ticket_6.id,  event="CREATED",  created_at=_ago(days=40)),
            TicketHistoryModel(ticket_id=ticket_9.id,  event="CREATED",  created_at=_ago(days=35)),
            TicketHistoryModel(ticket_id=ticket_12.id, event="CREATED",  created_at=_ago(days=10)),
            TicketHistoryModel(ticket_id=ticket_14.id, event="CREATED",  created_at=_ago(days=7)),
            TicketHistoryModel(ticket_id=ticket_16.id, event="CREATED",  created_at=_ago(days=3)),
            TicketHistoryModel(ticket_id=ticket_18.id, event="CREATED",  created_at=_ago(hours=18)),
        ]
        session.add_all(history)
        session.commit()
