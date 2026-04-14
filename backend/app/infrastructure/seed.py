from decimal import Decimal

from app.infrastructure.database import SessionLocal
from app.infrastructure.models import (
    InvoiceModel,
    MaintenanceTicketModel,
    PropertyModel,
    TenantModel,
    TechnicianModel,
    UnitModel,
)


def seed_demo_data() -> None:
    with SessionLocal() as session:
        if session.query(PropertyModel).first() is not None:
            return

        # ── Properties ──────────────────────────────────────────────────
        landmark = PropertyModel(
            name="Landmark Residences",
            address="Bahnhofstrasse 12, 8001 Zürich",
        )
        riverside = PropertyModel(
            name="Riverside Campus",
            address="Limmatquai 27, 8001 Zürich",
        )
        sunset = PropertyModel(
            name="Sunset Gardens",
            address="Rosenweg 5, 3007 Bern",
        )
        session.add_all([landmark, riverside, sunset])
        session.flush()

        # ── Units ────────────────────────────────────────────────────────
        unit_a1 = UnitModel(property_id=landmark.id, name="A1", floor="EG")
        unit_a2 = UnitModel(property_id=landmark.id, name="A2", floor="EG")
        unit_a3 = UnitModel(property_id=landmark.id, name="A3", floor="1. OG")
        unit_b1 = UnitModel(property_id=riverside.id, name="B1", floor="1. OG")
        unit_b2 = UnitModel(property_id=riverside.id, name="B2", floor="2. OG")
        unit_c1 = UnitModel(property_id=sunset.id,   name="C1", floor="EG")
        unit_c2 = UnitModel(property_id=sunset.id,   name="C2", floor="1. OG")
        unit_c3 = UnitModel(property_id=sunset.id,   name="C3", floor="2. OG")
        session.add_all([unit_a1, unit_a2, unit_a3, unit_b1, unit_b2, unit_c1, unit_c2, unit_c3])
        session.flush()

        # ── Tenants ──────────────────────────────────────────────────────
        tenant_a1 = TenantModel(name="Mia Grün",        email="mia.gruen@example.com",      unit_id=unit_a1.id)
        tenant_a2 = TenantModel(name="Jonas Weber",     email="jonas.weber@example.com",     unit_id=unit_a2.id)
        tenant_a3 = TenantModel(name="Lena Fischer",    email="lena.fischer@example.com",    unit_id=unit_a3.id)
        tenant_b1 = TenantModel(name="Sara Klein",      email="sara.klein@example.com",      unit_id=unit_b1.id)
        tenant_b2 = TenantModel(name="Felix Braun",     email="felix.braun@example.com",     unit_id=unit_b2.id)
        tenant_c1 = TenantModel(name="Sophie Müller",   email="sophie.mueller@example.com",  unit_id=unit_c1.id)
        tenant_c2 = TenantModel(name="David Schneider", email="david.schneider@example.com", unit_id=unit_c2.id)
        tenant_c3 = TenantModel(name="Anna Bauer",      email="anna.bauer@example.com",      unit_id=unit_c3.id)
        session.add_all([tenant_a1, tenant_a2, tenant_a3, tenant_b1, tenant_b2, tenant_c1, tenant_c2, tenant_c3])
        session.flush()

        # ── Technicians (verschiedene Fachgebiete für Auto-Zuweisung) ───
        tech_elektro   = TechnicianModel(name="Lea Hoffmann",    expertise="Elektrik Strom Kurzschluss Elektroinstallation Sicherung")
        tech_sanitaer  = TechnicianModel(name="Tim Berger",      expertise="Sanitär Heizung Wasser Rohrbruch Wasserrohrbruch Warmwasser")
        tech_schlosser = TechnicianModel(name="Anna Schulz",     expertise="Schlosserei Türen Fenster Schloss Scharnier Einbruch")
        tech_allgemein = TechnicianModel(name="Marco Richter",   expertise="Allgemein Maler Wände Fliesen Renovierung Anstrich")
        tech_klima     = TechnicianModel(name="Tobias Lang",     expertise="Klimaanlage Lüftung Klimatechnik Belüftung Kühlung Ventilation")
        tech_dach      = TechnicianModel(name="Klara Vogel",     expertise="Dach Dachdecker Abdichtung Dachrinne Dachschaden Undicht")
        tech_garten    = TechnicianModel(name="Stefan Krause",   expertise="Garten Aussenanlagen Grünfläche Baum Hecke Gehweg Pflaster")
        session.add_all([tech_elektro, tech_sanitaer, tech_schlosser, tech_allgemein, tech_klima, tech_dach, tech_garten])
        session.flush()

        # ── Tickets (verschiedene Prioritäten + Status für Demo) ─────────
        ticket_1 = MaintenanceTicketModel(
            title="Heizungsausfall im Wohnzimmer",
            description="Die Heizung heizt seit gestern Abend nicht mehr. Notfall da Aussentemperatur -5°C.",
            unit_id=unit_a1.id, tenant_id=tenant_a1.id,
            technician_id=tech_sanitaer.id,
            status="RESOLVED", priority="HIGH",
        )
        ticket_2 = MaintenanceTicketModel(
            title="Fenster klemmt — Schlafzimmer",
            description="Das Schlafzimmerfenster lässt sich nicht mehr öffnen.",
            unit_id=unit_a2.id, tenant_id=tenant_a2.id,
            status="OPEN", priority="MEDIUM",
        )
        ticket_3 = MaintenanceTicketModel(
            title="Stromausfall Küchensteckdose",
            description="Die Steckdose in der Küche liefert keinen Strom mehr. Kurzschluss vermutlich.",
            unit_id=unit_b1.id, tenant_id=tenant_b1.id,
            technician_id=tech_elektro.id,
            status="IN_PROGRESS", priority="HIGH",
        )
        ticket_4 = MaintenanceTicketModel(
            title="Routinewartung Heizungsanlage",
            description="Jährliche Inspektion und Wartung der Zentralheizung.",
            unit_id=unit_b2.id, tenant_id=tenant_b2.id,
            status="OPEN", priority="LOW",
        )
        ticket_5 = MaintenanceTicketModel(
            title="Wasserhahn tropft im Bad",
            description="Der Wasserhahn im Badezimmer tropft dauerhaft.",
            unit_id=unit_a2.id, tenant_id=tenant_a2.id,
            technician_id=tech_sanitaer.id,
            status="ASSIGNED", priority="MEDIUM",
        )
        ticket_6 = MaintenanceTicketModel(
            title="Klimaanlage kühlt nicht mehr",
            description="Die Klimaanlage im Schlafzimmer läuft, produziert aber keine Kühlung mehr.",
            unit_id=unit_c1.id, tenant_id=tenant_c1.id,
            status="OPEN", priority="MEDIUM",
        )
        ticket_7 = MaintenanceTicketModel(
            title="Dachrinne verstopft — Wasserschaden droht",
            description="Die Dachrinne ist vollständig verstopft, bei Regen läuft Wasser die Fassade runter.",
            unit_id=unit_c2.id, tenant_id=tenant_c2.id,
            technician_id=tech_dach.id,
            status="ASSIGNED", priority="HIGH",
        )
        ticket_8 = MaintenanceTicketModel(
            title="Sicherung springt dauernd raus",
            description="Die Sicherung für Zimmer 2 fliegt mehrmals täglich raus. Elektrik prüfen.",
            unit_id=unit_a3.id, tenant_id=tenant_a3.id,
            status="OPEN", priority="HIGH",
        )
        ticket_9 = MaintenanceTicketModel(
            title="Türschloss defekt — Haupteingang",
            description="Das Türschloss am Haupteingang klemmt. Einbruchgefahr.",
            unit_id=unit_c3.id, tenant_id=tenant_c3.id,
            technician_id=tech_schlosser.id,
            status="IN_PROGRESS", priority="HIGH",
        )
        ticket_10 = MaintenanceTicketModel(
            title="Gehwegplatten locker — Sturzgefahr",
            description="Mehrere Gehwegplatten vor dem Eingang sind locker. Sturzgefahr für Bewohner.",
            unit_id=unit_c1.id, tenant_id=tenant_c1.id,
            status="OPEN", priority="MEDIUM",
        )
        ticket_11 = MaintenanceTicketModel(
            title="Wandfarbe abgeblättert — Flur",
            description="Im Eingangsflur blättert die Farbe ab, kosmetische Renovation nötig.",
            unit_id=unit_b2.id, tenant_id=tenant_b2.id,
            technician_id=tech_allgemein.id,
            status="CLOSED", priority="LOW",
        )
        ticket_12 = MaintenanceTicketModel(
            title="Kein warmes Wasser seit 2 Tagen",
            description="Warmwasser funktioniert nicht. Dringend, da Kleinkind im Haushalt.",
            unit_id=unit_c2.id, tenant_id=tenant_c2.id,
            status="OPEN", priority="HIGH",
        )
        session.add_all([
            ticket_1, ticket_2, ticket_3, ticket_4, ticket_5, ticket_6,
            ticket_7, ticket_8, ticket_9, ticket_10, ticket_11, ticket_12,
        ])
        session.flush()

        invoice_1 = InvoiceModel(ticket_id=ticket_1.id, amount=Decimal("240.00"), paid=True)
        invoice_11 = InvoiceModel(ticket_id=ticket_11.id, amount=Decimal("180.00"), paid=True)
        session.add_all([invoice_1, invoice_11])
        session.commit()
