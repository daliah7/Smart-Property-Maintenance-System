export type TicketPriority = "HIGH" | "MEDIUM" | "LOW";

export interface Ticket {
  id: number;
  title: string;
  description: string;
  unit_id: number;
  tenant_id?: number;
  technician_id?: number;
  status: string;
  priority: TicketPriority;
  created_at: string;
  updated_at: string;
}

export interface Technician {
  id: number;
  name: string;
  expertise: string;
}

export interface Unit {
  id: number;
  property_id: number;
  name: string;
  floor: string;
}

export interface Tenant {
  id: number;
  name: string;
  email: string;
  unit_id: number;
}

export interface Invoice {
  id: number;
  ticket_id: number;
  amount: number;
  paid: boolean;
  created_at: string;
  paid_at?: string;
}

export interface Property {
  id: number;
  name: string;
  address: string;
}

export interface TicketCreatePayload {
  title: string;
  description: string;
  unit_id: number;
  tenant_id?: number;
  priority?: TicketPriority;
}
