from enum import Enum


class TicketStatus(str, Enum):
    OPEN = "OPEN"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class TicketPriority(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


# Keywords that indicate HIGH priority (de + en)
HIGH_PRIORITY_KEYWORDS = {
    "notfall", "dringend", "dringend!", "gefahr", "gefährlich", "wasser",
    "überflutung", "überschwemmung", "rohrbruch", "wasserrohrbruch", "leck",
    "feuer", "brand", "gas", "gasleck", "heizung", "heizungsausfall",
    "strom", "stromausfall", "kurzschluss", "elektrik", "elektrisch",
    "bruch", "ausfall", "kaputt", "sofort", "urgent", "emergency", "critical",
    "flut", "nässe", "schimmel",
}

# Keywords that indicate LOW priority
LOW_PRIORITY_KEYWORDS = {
    "kosmetisch", "kleinigkeit", "schönheit", "überprüfung", "check",
    "inspektion", "routinewartung", "routine", "wartung", "prüfung",
    "streichen", "farbe", "kratzer", "optik",
}


def infer_priority(title: str, description: str) -> "TicketPriority":
    """Infer ticket priority from title and description keywords."""
    text = f"{title} {description}".lower()
    words = set(text.split())
    if words & HIGH_PRIORITY_KEYWORDS:
        return TicketPriority.HIGH
    if words & LOW_PRIORITY_KEYWORDS:
        return TicketPriority.LOW
    return TicketPriority.MEDIUM


ALLOWED_STATUS_TRANSITIONS = {
    TicketStatus.OPEN: [TicketStatus.ASSIGNED],
    TicketStatus.ASSIGNED: [TicketStatus.IN_PROGRESS],
    TicketStatus.IN_PROGRESS: [TicketStatus.RESOLVED],
    TicketStatus.RESOLVED: [TicketStatus.CLOSED],
    TicketStatus.CLOSED: [],
}
