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
  reporter_name?: string;
}

export interface TicketHistory {
  id: number;
  ticket_id: number;
  event: string;
  note?: string;
  created_at: string;
}

export interface PropertyMetric {
  property_name: string;
  ticket_count: number;
  total_cost: number;
}

export interface MonthlyTrend {
  month: string;
  count: number;
}

export interface AnalyticsData {
  avg_resolution_hours: number;
  sla_compliance_pct: number;
  total_cost: number;
  avg_cost_per_ticket: number;
  tickets_per_property: PropertyMetric[];
  monthly_trend: MonthlyTrend[];
  escalated_count: number;
  at_risk_count: number;
}

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}
