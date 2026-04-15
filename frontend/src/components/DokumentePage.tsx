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
  { id: "1", name: "Mietvertrag_Weber_EG-Links.pdf",    category: "Mietverträge",        property: "Musterstrasse 12", size: "312 KB", date: "2023-04-01", type: "pdf" },
  { id: "2", name: "Mietvertrag_Meier_1OG-Rechts.pdf",  category: "Mietverträge",        property: "Musterstrasse 12", size: "298 KB", date: "2022-09-15", type: "pdf" },
  { id: "3", name: "Uebergabeprotokoll_EG-Links.pdf",   category: "Protokolle",          property: "Musterstrasse 12", size: "1.2 MB", date: "2023-04-01", type: "pdf" },
  { id: "4", name: "Heizungsservice_2024.pdf",          category: "Wartungsnachweise",   property: "Musterstrasse 12", size: "88 KB",  date: "2024-10-15", type: "pdf" },
  { id: "5", name: "Gebaeudeversicherung_2025.pdf",     category: "Versicherungen",      property: "Alle Objekte",     size: "540 KB", date: "2025-01-01", type: "pdf" },
  { id: "6", name: "Brandschutzprotokoll_2025.pdf",     category: "Brandschutz",         property: "Alle Objekte",     size: "210 KB", date: "2025-01-08", type: "pdf" },
  { id: "7", name: "Grundriss_Bahnhofstr5.pdf",         category: "Pläne",               property: "Bahnhofstr. 5",   size: "3.4 MB", date: "2019-06-12", type: "pdf" },
  { id: "8", name: "Energieausweis_Musterstrasse.pdf",  category: "Zertifikate",         property: "Musterstrasse 12", size: "180 KB", date: "2020-03-10", type: "pdf" },
  { id: "9", name: "Hausverwaltungsvertrag.pdf",        category: "Verträge",            property: "Alle Objekte",     size: "420 KB", date: "2021-07-01", type: "pdf" },
  { id: "10", name: "Foto_Wasserschaden_Apr2025.jpg",   category: "Schadensdokumentation", property: "Musterstrasse 12", size: "2.1 MB", date: "2025-04-02", type: "img" },
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
