import { useRef, useState } from "react";
import type { Property, Tenant, Unit } from "../types";

interface Doc {
  id: string;
  name: string;
  category: string;
  property: string;
  size: string;
  date: string;
  type: string;
}

const SEED_DOCS: Doc[] = [
  // ── Mietverträge ──────────────────────────────────────────────────────
  { id: "1",  name: "Mietvertrag_Ballmer_A4.pdf",              category: "Mietverträge",          property: "Landmark Residences",        size: "318 KB", date: "2023-04-01", type: "pdf" },
  { id: "2",  name: "Mietvertrag_Renggli_A5.pdf",              category: "Mietverträge",          property: "Landmark Residences",        size: "305 KB", date: "2022-09-15", type: "pdf" },
  { id: "3",  name: "Mietvertrag_Brunner-Moser_Penthouse.pdf", category: "Mietverträge",          property: "Landmark Residences",        size: "412 KB", date: "2021-07-01", type: "pdf" },
  { id: "4",  name: "Mietvertrag_Schurmann_B4.pdf",            category: "Mietverträge",          property: "Riverside Campus",           size: "298 KB", date: "2023-01-15", type: "pdf" },
  { id: "5",  name: "Mietvertrag_Napfer-Suter_B9.pdf",         category: "Mietverträge",          property: "Riverside Campus",           size: "340 KB", date: "2022-06-01", type: "pdf" },
  { id: "6",  name: "Mietvertrag_Bernasconi_C4.pdf",           category: "Mietverträge",          property: "Sunset Gardens",             size: "322 KB", date: "2023-08-01", type: "pdf" },
  { id: "7",  name: "Mietvertrag_Clerici_Penthouse.pdf",       category: "Mietverträge",          property: "Sunset Gardens",             size: "398 KB", date: "2020-04-01", type: "pdf" },
  { id: "8",  name: "Mietvertrag_Schwarzenbach_D4.pdf",        category: "Mietverträge",          property: "Zürichberg Residenz",        size: "311 KB", date: "2024-01-01", type: "pdf" },
  { id: "9",  name: "Mietvertrag_Buehler_D10.pdf",             category: "Mietverträge",          property: "Zürichberg Residenz",        size: "420 KB", date: "2019-09-01", type: "pdf" },
  { id: "10", name: "Mietvertrag_Pictet_F4.pdf",               category: "Mietverträge",          property: "Rive du Lac",                size: "335 KB", date: "2023-05-01", type: "pdf" },
  { id: "11", name: "Mietvertrag_Necker_Penthouse.pdf",        category: "Mietverträge",          property: "Rive du Lac",                size: "455 KB", date: "2021-01-01", type: "pdf" },
  { id: "12", name: "Mietvertrag_Dufour_G4.pdf",               category: "Mietverträge",          property: "Les Terrasses de Lausanne",  size: "287 KB", date: "2024-03-01", type: "pdf" },
  { id: "13", name: "Mietvertrag_Rosset-Pellet_Attika.pdf",    category: "Mietverträge",          property: "Les Terrasses de Lausanne",  size: "362 KB", date: "2022-11-01", type: "pdf" },
  // ── Protokolle ───────────────────────────────────────────────────────
  { id: "14", name: "Uebergabeprotokoll_A4_2023.pdf",          category: "Protokolle",            property: "Landmark Residences",        size: "1.2 MB", date: "2023-04-01", type: "pdf" },
  { id: "15", name: "Uebergabeprotokoll_Penthouse_2021.pdf",   category: "Protokolle",            property: "Landmark Residences",        size: "1.5 MB", date: "2021-07-01", type: "pdf" },
  { id: "16", name: "Jahresprotokoll_Liegenschaft_2024.pdf",   category: "Protokolle",            property: "Alle Objekte",               size: "890 KB", date: "2025-01-15", type: "pdf" },
  { id: "17", name: "Eigentuemerversammlung_2024.pdf",         category: "Protokolle",            property: "Zürichberg Residenz",        size: "640 KB", date: "2024-11-20", type: "pdf" },
  { id: "18", name: "Uebergabeprotokoll_B9_2022.pdf",          category: "Protokolle",            property: "Riverside Campus",           size: "1.1 MB", date: "2022-06-02", type: "pdf" },
  { id: "19", name: "Maengelprotokoll_F3_Auseinandersetzung.pdf", category: "Protokolle",         property: "Rive du Lac",                size: "780 KB", date: "2024-09-10", type: "pdf" },
  // ── Wartungsnachweise ────────────────────────────────────────────────
  { id: "20", name: "Heizungsservice_Landmark_2024.pdf",       category: "Wartungsnachweise",     property: "Landmark Residences",        size: "88 KB",  date: "2024-10-15", type: "pdf" },
  { id: "21", name: "Heizungsservice_Riverside_2024.pdf",      category: "Wartungsnachweise",     property: "Riverside Campus",           size: "92 KB",  date: "2024-11-02", type: "pdf" },
  { id: "22", name: "Aufzugsinspektion_Schindler_2024.pdf",    category: "Wartungsnachweise",     property: "Sunset Gardens",             size: "155 KB", date: "2024-03-20", type: "pdf" },
  { id: "23", name: "Legionellencheck_2024.pdf",               category: "Wartungsnachweise",     property: "Alle Objekte",               size: "210 KB", date: "2024-11-10", type: "pdf" },
  { id: "24", name: "Elektroverteiler_Jahrescheck_2024.pdf",   category: "Wartungsnachweise",     property: "Alle Objekte",               size: "130 KB", date: "2024-12-01", type: "pdf" },
  { id: "25", name: "Lueftungsanlage_Filter_2025.pdf",         category: "Wartungsnachweise",     property: "Les Terrasses de Lausanne",  size: "75 KB",  date: "2025-03-27", type: "pdf" },
  { id: "26", name: "PV-Anlage_Wechselrichter_Check_2025.pdf", category: "Wartungsnachweise",     property: "Sunset Gardens",             size: "98 KB",  date: "2025-04-03", type: "pdf" },
  // ── Versicherungen ───────────────────────────────────────────────────
  { id: "27", name: "Gebaeudeversicherung_GV2025.pdf",         category: "Versicherungen",        property: "Alle Objekte",               size: "540 KB", date: "2025-01-01", type: "pdf" },
  { id: "28", name: "Haftpflichtversicherung_2025.pdf",        category: "Versicherungen",        property: "Alle Objekte",               size: "380 KB", date: "2025-01-01", type: "pdf" },
  { id: "29", name: "Elementarschadenversicherung_2025.pdf",   category: "Versicherungen",        property: "Landmark Residences",        size: "295 KB", date: "2025-02-01", type: "pdf" },
  { id: "30", name: "Glasversicherung_Rive_du_Lac_2025.pdf",   category: "Versicherungen",        property: "Rive du Lac",                size: "188 KB", date: "2025-01-01", type: "pdf" },
  // ── Brandschutz ──────────────────────────────────────────────────────
  { id: "31", name: "Brandschutzprotokoll_2025.pdf",           category: "Brandschutz",           property: "Alle Objekte",               size: "210 KB", date: "2025-01-08", type: "pdf" },
  { id: "32", name: "Feuerlöscher_Kontrolle_2024.pdf",         category: "Brandschutz",           property: "Alle Objekte",               size: "145 KB", date: "2024-06-01", type: "pdf" },
  { id: "33", name: "Sprinkleranlage_Prüfprotokoll_2024.pdf",  category: "Brandschutz",           property: "Rive du Lac",                size: "265 KB", date: "2024-07-15", type: "pdf" },
  { id: "34", name: "Evakuierungsplan_Landmark.pdf",           category: "Brandschutz",           property: "Landmark Residences",        size: "1.8 MB", date: "2023-09-01", type: "pdf" },
  { id: "35", name: "Blitzschutzprotokoll_2022.pdf",           category: "Brandschutz",           property: "Landmark Residences",        size: "120 KB", date: "2022-05-12", type: "pdf" },
  // ── Pläne ────────────────────────────────────────────────────────────
  { id: "36", name: "Grundriss_Landmark_EG.pdf",               category: "Pläne",                 property: "Landmark Residences",        size: "4.2 MB", date: "2019-03-01", type: "pdf" },
  { id: "37", name: "Grundriss_Riverside_Campus.pdf",          category: "Pläne",                 property: "Riverside Campus",           size: "3.8 MB", date: "2018-11-15", type: "pdf" },
  { id: "38", name: "Heizungsplan_Sunset_Gardens.pdf",         category: "Pläne",                 property: "Sunset Gardens",             size: "2.9 MB", date: "2017-06-01", type: "pdf" },
  { id: "39", name: "Elektroinstallationsplan_Zurichberg.pdf", category: "Pläne",                 property: "Zürichberg Residenz",        size: "5.1 MB", date: "2016-08-20", type: "pdf" },
  { id: "40", name: "Lageplan_Rive_du_Lac.pdf",                category: "Pläne",                 property: "Rive du Lac",                size: "2.4 MB", date: "2020-01-10", type: "pdf" },
  // ── Zertifikate ──────────────────────────────────────────────────────
  { id: "41", name: "Energieausweis_Landmark_2020.pdf",        category: "Zertifikate",           property: "Landmark Residences",        size: "180 KB", date: "2020-03-10", type: "pdf" },
  { id: "42", name: "Minergie-Zertifikat_Sunset_Gardens.pdf",  category: "Zertifikate",           property: "Sunset Gardens",             size: "245 KB", date: "2017-09-01", type: "pdf" },
  { id: "43", name: "TUeV_Aufzug_Zertifikat_2024.pdf",         category: "Zertifikate",           property: "Sunset Gardens",             size: "195 KB", date: "2024-03-21", type: "pdf" },
  { id: "44", name: "Energieausweis_Riverside_2021.pdf",       category: "Zertifikate",           property: "Riverside Campus",           size: "175 KB", date: "2021-05-15", type: "pdf" },
  // ── Verträge ─────────────────────────────────────────────────────────
  { id: "45", name: "Hausverwaltungsvertrag_2021.pdf",         category: "Verträge",              property: "Alle Objekte",               size: "420 KB", date: "2021-07-01", type: "pdf" },
  { id: "46", name: "Reinigungsvertrag_2024.pdf",              category: "Verträge",              property: "Alle Objekte",               size: "185 KB", date: "2024-01-01", type: "pdf" },
  { id: "47", name: "Gartenpflegevertrag_Landmark_2025.pdf",   category: "Verträge",              property: "Landmark Residences",        size: "145 KB", date: "2025-01-01", type: "pdf" },
  { id: "48", name: "Wartungsvertrag_Schindler_Lift.pdf",      category: "Verträge",              property: "Sunset Gardens",             size: "230 KB", date: "2022-04-01", type: "pdf" },
  { id: "49", name: "Schneeräumvertrag_2024-2025.pdf",         category: "Verträge",              property: "Alle Objekte",               size: "98 KB",  date: "2024-10-01", type: "pdf" },
  // ── Schadensdokumentation ────────────────────────────────────────────
  { id: "50", name: "Wasserschaden_F3_Apr2025.jpg",            category: "Schadensdokumentation", property: "Rive du Lac",                size: "2.1 MB", date: "2025-04-02", type: "img" },
  { id: "51", name: "Feuchtigkeitsschaden_E1_Keller.jpg",      category: "Schadensdokumentation", property: "Seepark Nidwalden",          size: "1.8 MB", date: "2025-03-18", type: "img" },
  { id: "52", name: "Riss_Fassade_C5_Doku.pdf",                category: "Schadensdokumentation", property: "Sunset Gardens",             size: "3.4 MB", date: "2026-04-10", type: "pdf" },
  { id: "53", name: "Rohrbruch_A3_Fotos.jpg",                  category: "Schadensdokumentation", property: "Landmark Residences",        size: "4.2 MB", date: "2025-11-22", type: "img" },
  { id: "54", name: "Sturmschaden_Dach_G7_2025.jpg",           category: "Schadensdokumentation", property: "Les Terrasses de Lausanne",  size: "2.9 MB", date: "2025-01-08", type: "img" },
];

const CATEGORIES = ["Alle", "Mietverträge", "Protokolle", "Wartungsnachweise", "Versicherungen", "Brandschutz", "Pläne", "Zertifikate", "Verträge", "Schadensdokumentation"];

const TYPE_ICON: Record<string, string> = { pdf: "▤", img: "◫", doc: "▣", xls: "⊞" };

interface Props { properties: Property[]; units: Unit[]; tenants: Tenant[]; }

export function DokumentePage({ properties, units, tenants }: Props) {
  const [docs, setDocs]         = useState<Doc[]>(SEED_DOCS);
  const [category, setCategory] = useState("Alle");
  const [search, setSearch]     = useState("");
  const fileRef                 = useRef<HTMLInputElement>(null);

  const filtered = docs.filter(d =>
    (category === "Alle" || d.category === category) &&
    (search === "" || d.name.toLowerCase().includes(search.toLowerCase()) || d.property.toLowerCase().includes(search.toLowerCase()))
  );

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const newDocs: Doc[] = files.map(f => ({
      id: String(Date.now() + Math.random()),
      name: f.name,
      category: "Sonstige",
      property: "—",
      size: f.size > 1048576 ? `${(f.size / 1048576).toFixed(1)} MB` : `${Math.round(f.size / 1024)} KB`,
      date: new Date().toISOString().slice(0, 10),
      type: f.type.startsWith("image/") ? "img" : "pdf",
    }));
    setDocs(prev => [...newDocs, ...prev]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const deleteDoc = (id: string) => setDocs(prev => prev.filter(d => d.id !== id));

  const catCounts = Object.fromEntries(CATEGORIES.slice(1).map(c => [c, docs.filter(d => d.category === c).length]));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">▤ Dokumente</h2>
          <p className="page-subtitle">Verträge, Protokolle, Zertifikate und Nachweise zentral verwalten</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input ref={fileRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" style={{ display: "none" }} onChange={handleUpload} />
          <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>▲ Hochladen</button>
        </div>
      </div>

      {/* Stats row */}
      <div className="doc-stats-row">
        {[["Gesamt", docs.length, ""], ["Mietverträge", catCounts["Mietverträge"] ?? 0, "var(--accent)"], ["Versicherungen", catCounts["Versicherungen"] ?? 0, "var(--purple)"], ["Wartungsnachweise", catCounts["Wartungsnachweise"] ?? 0, "var(--warning)"]].map(([label, val, color]) => (
          <div key={label as string} className="doc-stat-card">
            <span className="doc-stat-val" style={{ color: (color as string) || "var(--text-primary)" }}>{val}</span>
            <span className="doc-stat-label">{label}</span>
          </div>
        ))}
      </div>

      <div className="doc-layout">
        {/* Sidebar */}
        <div className="doc-sidebar">
          <div className="doc-sidebar-title">Kategorien</div>
          {CATEGORIES.map(c => (
            <button key={c} className={`doc-cat-btn ${category === c ? "active" : ""}`} onClick={() => setCategory(c)}>
              <span>{c}</span>
              {c !== "Alle" && <span className="doc-cat-count">{catCounts[c] ?? 0}</span>}
            </button>
          ))}
        </div>

        {/* Main */}
        <div className="doc-main">
          <input className="doc-search" placeholder="Dokument suchen…" value={search} onChange={e => setSearch(e.target.value)} />
          <div className="doc-list">
            {filtered.length === 0 && <p style={{ color: "var(--text-muted)", padding: "20px 0" }}>Keine Dokumente gefunden.</p>}
            {filtered.map(doc => (
              <div key={doc.id} className="doc-row">
                <span className="doc-type-icon">{TYPE_ICON[doc.type] ?? "▤"}</span>
                <div className="doc-row-info">
                  <span className="doc-row-name">{doc.name}</span>
                  <span className="doc-row-meta">{doc.property} · {doc.size} · {doc.date}</span>
                </div>
                <span className="doc-cat-tag">{doc.category}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-ghost" style={{ fontSize: "0.75rem", padding: "4px 10px" }}>↓ Öffnen</button>
                  <button className="btn btn-ghost" style={{ fontSize: "0.75rem", padding: "4px 10px", color: "var(--danger)", borderColor: "var(--danger)" }} onClick={() => deleteDoc(doc.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
