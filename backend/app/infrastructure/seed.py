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
            address="Rosenweg 14, 3007 Bern",
        )
        riverside = PropertyModel(
            name="Riverside Campus",
            address="Seeburgstrasse 12, 6006 Luzern",
        )
        sunset = PropertyModel(
            name="Sunset Gardens",
            address="Via Cortivo 8, 6976 Castagnola-Lugano",
        )
        zuerichberg = PropertyModel(
            name="Zürichberg Residenz",
            address="Zürichbergstrasse 55, 8044 Zürich",
        )
        nidwalden = PropertyModel(
            name="Seepark Nidwalden",
            address="Seestrasse 22, 6374 Buochs",
        )
        rive_lac = PropertyModel(
            name="Rive du Lac",
            address="Quai du Général-Guisan 34, 1204 Genève",
        )
        lausanne = PropertyModel(
            name="Les Terrasses de Lausanne",
            address="Avenue de la Gare 12, 1003 Lausanne",
        )
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
            unit_a1, unit_a2, unit_a3,
            unit_b1, unit_b2,
            unit_c1, unit_c2, unit_c3,
            unit_d1, unit_d2, unit_d3,
            unit_e1, unit_e2,
            unit_f1, unit_f2, unit_f3,
            unit_g1, unit_g2, unit_g3,
        ])
        session.flush()

        # ── Tenants ──────────────────────────────────────────────────────
        tenant_a1 = TenantModel(name="Mia Grün",          email="mia.gruen@example.com",          unit_id=unit_a1.id)
        tenant_a2 = TenantModel(name="Jonas Weber",        email="jonas.weber@example.com",         unit_id=unit_a2.id)
        tenant_a3 = TenantModel(name="Lena Fischer",       email="lena.fischer@example.com",        unit_id=unit_a3.id)
        tenant_b1 = TenantModel(name="Sara Klein",         email="sara.klein@example.com",          unit_id=unit_b1.id)
        tenant_b2 = TenantModel(name="Felix Braun",        email="felix.braun@example.com",         unit_id=unit_b2.id)
        tenant_c1 = TenantModel(name="Sophie Müller",      email="sophie.mueller@example.com",      unit_id=unit_c1.id)
        tenant_c2 = TenantModel(name="David Schneider",    email="david.schneider@example.com",     unit_id=unit_c2.id)
        tenant_c3 = TenantModel(name="Anna Bauer",         email="anna.bauer@example.com",          unit_id=unit_c3.id)
        tenant_d1 = TenantModel(name="Lukas Meier",        email="lukas.meier@example.com",         unit_id=unit_d1.id)
        tenant_d2 = TenantModel(name="Nina Keller",        email="nina.keller@example.com",         unit_id=unit_d2.id)
        tenant_d3 = TenantModel(name="Pascal Zimmermann",  email="pascal.zimmermann@example.com",   unit_id=unit_d3.id)
        tenant_e1 = TenantModel(name="Ursula Gamma",       email="ursula.gamma@example.com",        unit_id=unit_e1.id)
        tenant_e2 = TenantModel(name="Bruno Kälin",        email="bruno.kaelin@example.com",        unit_id=unit_e2.id)
        tenant_f1 = TenantModel(name="Céline Dupont",      email="celine.dupont@example.com",       unit_id=unit_f1.id)
        tenant_f2 = TenantModel(name="Marc Fontaine",      email="marc.fontaine@example.com",       unit_id=unit_f2.id)
        tenant_f3 = TenantModel(name="Isabelle Rochat",    email="isabelle.rochat@example.com",     unit_id=unit_f3.id)
        tenant_g1 = TenantModel(name="Nathalie Vidal",     email="nathalie.vidal@example.com",      unit_id=unit_g1.id)
        tenant_g2 = TenantModel(name="Olivier Chevalier",  email="olivier.chevalier@example.com",   unit_id=unit_g2.id)
        tenant_g3 = TenantModel(name="Camille Morel",      email="camille.morel@example.com",       unit_id=unit_g3.id)
        session.add_all([
            tenant_a1, tenant_a2, tenant_a3,
            tenant_b1, tenant_b2,
            tenant_c1, tenant_c2, tenant_c3,
            tenant_d1, tenant_d2, tenant_d3,
            tenant_e1, tenant_e2,
            tenant_f1, tenant_f2, tenant_f3,
            tenant_g1, tenant_g2, tenant_g3,
        ])
        session.flush()

        # ── Technicians ──────────────────────────────────────────────────
        tech_elektro    = TechnicianModel(name="Lukas Novak",        expertise="Elektrik Strom Kurzschluss Elektroinstallation Sicherung")
        tech_sanitaer   = TechnicianModel(name="Tim Horvat",         expertise="Sanitär Heizung Wasser Rohrbruch Wasserrohrbruch Warmwasser")
        tech_schlosser  = TechnicianModel(name="Fabian Dupont",      expertise="Schlosserei Türen Fenster Schloss Scharnier Einbruch")
        tech_allgemein  = TechnicianModel(name="Marco Bianchi",      expertise="Allgemein Maler Wände Fliesen Renovierung Anstrich")
        tech_klima      = TechnicianModel(name="Tobias Keller",      expertise="Klimaanlage Lüftung Klimatechnik Belüftung Kühlung Ventilation")
        tech_dach       = TechnicianModel(name="Kevin Kovač",        expertise="Dach Dachdecker Abdichtung Dachrinne Dachschaden Undicht")
        tech_garten     = TechnicianModel(name="Stefan Laurent",     expertise="Garten Aussenanlagen Grünfläche Baum Hecke Gehweg Pflaster")
        tech_aufzug     = TechnicianModel(name="Reto Amstutz",      expertise="Aufzug Lift Elevator Aufzugswartung Aufzugsanlage")
        tech_solar      = TechnicianModel(name="Lorenzo Russo",      expertise="Solar Photovoltaik Solaranlage Solarpanel Energie Strom")
        tech_maler      = TechnicianModel(name="Carlos Ibáñez",     expertise="Maler Farbe Anstrich Tapete Putz Fassade Lackierung")
        tech_boden      = TechnicianModel(name="Yves Crettenand",   expertise="Boden Parkett Laminat Fliesen Estrich Teppich Bodenbelag")
        tech_it         = TechnicianModel(name="Chiara Bernasconi", expertise="IT Netzwerk Internet WLAN Kabel EDV Haustechnik Smarthome")
        tech_brand      = TechnicianModel(name="Dominik Frei",      expertise="Brandschutz Feuermelder Sprinkler Feuerlöscher Sicherheit Brand")
        tech_storen     = TechnicianModel(name="Miguel Delgado",     expertise="Storen Jalousie Rolladen Sonnenschutz Markise Beschattung")
        tech_schreiner  = TechnicianModel(name="Hannes Lüthi",      expertise="Schreiner Holz Möbel Einbauschrank Treppe Parkett Holzarbeiten")
        tech_installat  = TechnicianModel(name="Pierre Maillard",    expertise="Sanitärinstallation Wasserleitung Abfluss Rohr Kanalisation Ventil")
        tech_maurer     = TechnicianModel(name="Giorgio Ferretti",  expertise="Maurer Beton Mauerwerk Risse Abdichtung Keller Fundament")
        tech_haustechnik= TechnicianModel(name="Nicole Amstutz",    expertise="Haustechnik Gebäudetechnik Steuerung Automation Pumpe Regelung")
        tech_garagen    = TechnicianModel(name="Beat Zimmermann",   expertise="Garage Garagentor Tiefgarage Schranke Parkhaus Tor Motor")
        tech_reinigung  = TechnicianModel(name="Petra Hug",         expertise="Reinigung Hausreinigung Treppenhausreinigung Desinfektion Pflege")
        session.add_all([
            tech_elektro, tech_sanitaer, tech_schlosser, tech_allgemein, tech_klima,
            tech_dach, tech_garten, tech_aufzug, tech_solar, tech_maler, tech_boden,
            tech_it, tech_brand, tech_storen, tech_schreiner, tech_installat,
            tech_maurer, tech_haustechnik, tech_garagen, tech_reinigung,
        ])
        session.flush()

        # ── Tickets ──────────────────────────────────────────────────────
        # Landmark Residences (Bern)
        ticket_1 = MaintenanceTicketModel(
            title="Heizungsausfall im Wohnzimmer",
            description="Die Heizung heizt seit gestern Abend nicht mehr. Notfall da Aussentemperatur -5°C.",
            unit_id=unit_a1.id, tenant_id=tenant_a1.id,
            technician_id=tech_sanitaer.id, status="RESOLVED", priority="HIGH",
        )
        ticket_2 = MaintenanceTicketModel(
            title="Fenster klemmt — Schlafzimmer",
            description="Das Schlafzimmerfenster lässt sich nicht mehr öffnen.",
            unit_id=unit_a2.id, tenant_id=tenant_a2.id,
            status="OPEN", priority="MEDIUM",
        )
        ticket_3 = MaintenanceTicketModel(
            title="Sicherung springt dauernd raus",
            description="Die Sicherung für Zimmer 2 fliegt mehrmals täglich raus. Elektrik prüfen.",
            unit_id=unit_a3.id, tenant_id=tenant_a3.id,
            status="OPEN", priority="HIGH",
        )
        # Riverside Campus (Luzern)
        ticket_4 = MaintenanceTicketModel(
            title="Stromausfall Küchensteckdose",
            description="Die Steckdose in der Küche liefert keinen Strom mehr. Kurzschluss vermutlich.",
            unit_id=unit_b1.id, tenant_id=tenant_b1.id,
            technician_id=tech_elektro.id, status="IN_PROGRESS", priority="HIGH",
        )
        ticket_5 = MaintenanceTicketModel(
            title="Routinewartung Heizungsanlage",
            description="Jährliche Inspektion und Wartung der Zentralheizung.",
            unit_id=unit_b2.id, tenant_id=tenant_b2.id,
            status="OPEN", priority="LOW",
        )
        # Sunset Gardens (Lugano)
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
            technician_id=tech_dach.id, status="ASSIGNED", priority="HIGH",
        )
        ticket_8 = MaintenanceTicketModel(
            title="Türschloss defekt — Haupteingang",
            description="Das Türschloss am Haupteingang klemmt. Einbruchgefahr.",
            unit_id=unit_c3.id, tenant_id=tenant_c3.id,
            technician_id=tech_schlosser.id, status="IN_PROGRESS", priority="HIGH",
        )
        # Zürichberg Residenz
        ticket_9 = MaintenanceTicketModel(
            title="Aufzug ausser Betrieb",
            description="Der Aufzug bleibt zwischen EG und 1. OG stecken. Dringend reparieren.",
            unit_id=unit_d1.id, tenant_id=tenant_d1.id,
            status="OPEN", priority="HIGH",
        )
        ticket_10 = MaintenanceTicketModel(
            title="Wasserhahn tropft im Bad",
            description="Der Wasserhahn im Badezimmer tropft dauerhaft — hoher Wasserverbrauch.",
            unit_id=unit_d2.id, tenant_id=tenant_d2.id,
            technician_id=tech_sanitaer.id, status="ASSIGNED", priority="MEDIUM",
        )
        ticket_11 = MaintenanceTicketModel(
            title="Wandfarbe abgeblättert — Flur",
            description="Im Eingangsflur blättert die Farbe grossflächig ab, Renovation nötig.",
            unit_id=unit_d3.id, tenant_id=tenant_d3.id,
            technician_id=tech_allgemein.id, status="CLOSED", priority="LOW",
        )
        # Seepark Nidwalden
        ticket_12 = MaintenanceTicketModel(
            title="Kein warmes Wasser seit 2 Tagen",
            description="Warmwasser funktioniert nicht. Dringend, da Kleinkind im Haushalt.",
            unit_id=unit_e1.id, tenant_id=tenant_e1.id,
            status="OPEN", priority="HIGH",
        )
        ticket_13 = MaintenanceTicketModel(
            title="Gehwegplatten locker — Sturzgefahr",
            description="Mehrere Gehwegplatten vor dem Seeeingang sind locker. Sturzgefahr.",
            unit_id=unit_e2.id, tenant_id=tenant_e2.id,
            technician_id=tech_garten.id, status="ASSIGNED", priority="MEDIUM",
        )
        # Rive du Lac (Genf)
        ticket_14 = MaintenanceTicketModel(
            title="Feuchtigkeitsschaden im Keller",
            description="Nach dem Regen dringt Wasser durch die Kellerwand. Schimmelgefahr.",
            unit_id=unit_f1.id, tenant_id=tenant_f1.id,
            status="OPEN", priority="HIGH",
        )
        ticket_15 = MaintenanceTicketModel(
            title="Lüftungsanlage defekt",
            description="Die zentrale Lüftung macht laute Geräusche und riecht verbrannt.",
            unit_id=unit_f2.id, tenant_id=tenant_f2.id,
            technician_id=tech_klima.id, status="IN_PROGRESS", priority="HIGH",
        )
        ticket_16 = MaintenanceTicketModel(
            title="Balkongeländer locker",
            description="Das Geländer auf dem Balkon wackelt stark — Sicherheitsrisiko.",
            unit_id=unit_f3.id, tenant_id=tenant_f3.id,
            status="OPEN", priority="MEDIUM",
        )
        # Les Terrasses de Lausanne
        ticket_17 = MaintenanceTicketModel(
            title="Rohrbruch im Badezimmer",
            description="Ein Rohr unter dem Waschbecken ist gebrochen, Wasser läuft auf den Boden.",
            unit_id=unit_g1.id, tenant_id=tenant_g1.id,
            technician_id=tech_sanitaer.id, status="IN_PROGRESS", priority="HIGH",
        )
        ticket_18 = MaintenanceTicketModel(
            title="Storen (Jalousie) klemmt",
            description="Die elektrische Storen im Wohnzimmer lässt sich nicht mehr hochfahren.",
            unit_id=unit_g2.id, tenant_id=tenant_g2.id,
            status="OPEN", priority="MEDIUM",
        )
        ticket_19 = MaintenanceTicketModel(
            title="Gartentor defekt — Schloss kaputt",
            description="Das Schloss am Gartentor ist gebrochen, Tor lässt sich nicht mehr schliessen.",
            unit_id=unit_g3.id, tenant_id=tenant_g3.id,
            technician_id=tech_schlosser.id, status="ASSIGNED", priority="MEDIUM",
        )
        session.add_all([
            ticket_1, ticket_2, ticket_3, ticket_4, ticket_5, ticket_6,
            ticket_7, ticket_8, ticket_9, ticket_10, ticket_11, ticket_12,
            ticket_13, ticket_14, ticket_15, ticket_16,
            ticket_17, ticket_18, ticket_19,
        ])
        session.flush()

        invoice_1  = InvoiceModel(ticket_id=ticket_1.id,  amount=Decimal("240.00"), paid=True)
        invoice_11 = InvoiceModel(ticket_id=ticket_11.id, amount=Decimal("180.00"), paid=True)
        session.add_all([invoice_1, invoice_11])
        session.commit()
