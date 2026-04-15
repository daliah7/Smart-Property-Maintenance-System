import { useRef, useState } from "react";
import { createTicket } from "../api";
import { useLanguage } from "../i18n/LanguageContext";
import type { Ticket, Unit } from "../types";
import { StatusBadge } from "./StatusBadge";
import { AvailabilityCalendar } from "./AvailabilityCalendar";

const SLA_HOURS: Record<string, number> = { HIGH: 4, MEDIUM: 24, LOW: 72 };

function getSLALabel(ticket: Ticket): { label: string; cls: string } | null {
  if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") return null;
  const slaH = SLA_HOURS[ticket.priority] ?? 24;
  const elapsed = (Date.now() - new Date(ticket.created_at).getTime()) / 3600000;
  if (elapsed > slaH) return { label: "🔴 Überfällig", cls: "sla-exceeded" };
  if (elapsed > slaH * 0.8) return { label: "🟡 At Risk", cls: "sla-risk" };
  return null;
}

function formatPortalDate(iso: string): string {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

/** Compress an image file to a JPEG data-URL, max 800px wide, quality 0.72 */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 800;
        let { width, height } = img;
        if (width > MAX) { height = Math.round((height * MAX) / width); width = MAX; }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface Props {
  units: Unit[];
  tickets: Ticket[];
  onTicketCreated: () => void;
  onShowTicket: (ticket: Ticket) => void;
}

export function TenantPortal({ units, tickets, onTicketCreated, onShowTicket }: Props) {
  const { t } = useLanguage();

  const [selectedUnit, setSelectedUnit] = useState<number>(0);
  const [activeTab, setActiveTab]       = useState<"create" | "list">("create");

  // Form state
  const [reporterName, setReporterName] = useState("");
  const [title, setTitle]               = useState("");
  const [desc, setDesc]                 = useState("");
  const [availDates, setAvailDates]     = useState<string[]>([]);
  const [imageData, setImageData]       = useState<string | null>(null);
  const [imageName, setImageName]       = useState<string>("");
  const [imageError, setImageError]     = useState<string>("");
  const [submitting, setSubmitting]     = useState(false);
  const [successMsg, setSuccessMsg]     = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const myTickets = selectedUnit > 0
    ? tickets
        .filter(tk => tk.unit_id === selectedUnit)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : [];

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError("");

    if (!file.type.startsWith("image/")) {
      setImageError("Nur Bilddateien erlaubt (JPG, PNG, WEBP …)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImageError("Bild zu gross (max. 10 MB)");
      return;
    }
    try {
      const compressed = await compressImage(file);
      setImageData(compressed);
      setImageName(file.name);
    } catch {
      setImageError("Bild konnte nicht verarbeitet werden.");
    }
  };

  const removeImage = () => {
    setImageData(null);
    setImageName("");
    setImageError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit || !reporterName.trim() || !title.trim() || !desc.trim()) return;

    setSubmitting(true);
    try {
      // Append availability and image to description
      const availBlock = availDates.length > 0
        ? `\n\nVerfügbarkeit: ${availDates.join(", ")}`
        : "";
      const fullDescription = imageData
        ? `${desc.trim()}${availBlock}\n\n[BILD:${imageName}]\n${imageData}`
        : `${desc.trim()}${availBlock}`;

      await createTicket({
        title: title.trim(),
        description: fullDescription,
        unit_id: selectedUnit,
        reporter_name: reporterName.trim(),
      });

      setTitle(""); setDesc(""); removeImage(); setAvailDates([]);
      setSuccessMsg(t("portalSuccess"));
      onTicketCreated();
      setTimeout(() => { setSuccessMsg(""); setActiveTab("list"); }, 1800);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !submitting && !!selectedUnit && !!reporterName.trim() && !!title.trim() && !!desc.trim();

  return (
    <div className="portal-page">
      {/* Header */}
      <div className="portal-header">
        <div className="portal-header-icon">⌂</div>
        <div>
          <h2 className="portal-title">{t("portalTitle")}</h2>
          <p className="portal-subtitle">{t("portalSubtitle")}</p>
        </div>
      </div>

      {/* Unit selector */}
      <div className="portal-unit-selector">
        <label className="form-label">
          {t("portalSelectUnit")}
          <select
            value={selectedUnit}
            onChange={e => setSelectedUnit(Number(e.target.value))}
            className="portal-unit-select"
          >
            <option value={0}>— Einheit auswählen —</option>
            {units.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} · {u.floor}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Tabs */}
      <div className="portal-tabs">
        <button className={`portal-tab ${activeTab === "create" ? "active" : ""}`} onClick={() => setActiveTab("create")}>
          ＋ {t("portalCreateTitle")}
        </button>
        <button className={`portal-tab ${activeTab === "list" ? "active" : ""}`} onClick={() => setActiveTab("list")}>
          ◎ {t("portalMyTickets")} {selectedUnit > 0 && myTickets.length > 0 && `(${myTickets.length})`}
        </button>
      </div>

      {/* Create form */}
      {activeTab === "create" && (
        <div className="portal-card">
          {successMsg && <div className="portal-success">{successMsg}</div>}
          <form onSubmit={handleSubmit} className="portal-form">

            {/* Reporter name */}
            <label className="form-label">
              Ihr Name <span className="form-required">*</span>
              <input
                type="text"
                value={reporterName}
                onChange={e => setReporterName(e.target.value)}
                placeholder="Vor- und Nachname"
                required
                disabled={!selectedUnit}
                autoComplete="name"
              />
            </label>

            {/* Title */}
            <label className="form-label">
              {t("portalTitleLabel")}
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={t("portalTitlePlaceholder")}
                required
                disabled={!selectedUnit}
              />
            </label>

            {/* Description */}
            <label className="form-label">
              {t("portalDescLabel")}
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder={selectedUnit ? t("portalDescPlaceholder") : t("portalSelectFirst")}
                rows={4}
                required
                disabled={!selectedUnit}
              />
            </label>

            {/* Availability calendar */}
            <div className="form-label">
              <span>{t("portalAvailability")}</span>
              <p className="portal-hint" style={{ margin: "4px 0 8px" }}>
                💡 {t("portalAvailabilityHint")}
              </p>
              <AvailabilityCalendar
                selectedDates={availDates}
                onChange={setAvailDates}
                disabled={!selectedUnit}
              />
            </div>

            {/* Image upload */}
            <div className="form-label">
              <span>Foto / Bild <span className="form-optional">(optional)</span></span>
              {!imageData ? (
                <div
                  className={`upload-zone ${!selectedUnit ? "upload-zone-disabled" : ""}`}
                  onClick={() => selectedUnit && fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); }}
                  onDrop={e => {
                    e.preventDefault();
                    if (!selectedUnit) return;
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      const dt = new DataTransfer();
                      dt.items.add(file);
                      if (fileInputRef.current) fileInputRef.current.files = dt.files;
                      handleImageChange({ target: { files: dt.files } } as React.ChangeEvent<HTMLInputElement>);
                    }
                  }}
                >
                  <span className="upload-zone-icon">◫</span>
                  <span className="upload-zone-text">Bild hierher ziehen oder <u>auswählen</u></span>
                  <span className="upload-zone-hint">JPG, PNG, WEBP · max. 10 MB</span>
                </div>
              ) : (
                <div className="upload-preview">
                  <img src={imageData} alt="Vorschau" className="upload-preview-img" />
                  <div className="upload-preview-info">
                    <span className="upload-preview-name">◫ {imageName}</span>
                    <button type="button" className="upload-preview-remove" onClick={removeImage}>
                      ✕ Entfernen
                    </button>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleImageChange}
                disabled={!selectedUnit}
              />
              {imageError && <p className="upload-error">{imageError}</p>}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={!canSubmit}
            >
              {submitting ? t("portalSubmitting") : t("portalSubmit")}
            </button>
          </form>
          <p className="portal-hint">
            💡 Ihr Ticket wird automatisch an den passenden Techniker weitergeleitet.
          </p>
        </div>
      )}

      {/* My tickets */}
      {activeTab === "list" && (
        <div className="portal-card">
          {!selectedUnit ? (
            <p className="portal-empty">{t("portalSelectFirst")}</p>
          ) : myTickets.length === 0 ? (
            <p className="portal-empty">{t("portalNoTickets")}</p>
          ) : (
            <div className="portal-ticket-list">
              {myTickets.map(ticket => {
                const sla = getSLALabel(ticket);
                return (
                  <button key={ticket.id} className="portal-ticket-item" onClick={() => onShowTicket(ticket)}>
                    <div className="portal-ticket-top">
                      <span className="portal-ticket-title">{ticket.title}</span>
                      <StatusBadge status={ticket.status} />
                    </div>
                    <div className="portal-ticket-meta">
                      <span>#{ticket.id}</span>
                      <span>·</span>
                      <span>{formatPortalDate(ticket.created_at)}</span>
                      {sla && <span className={`sla-badge-small ${sla.cls}`}>{sla.label}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
