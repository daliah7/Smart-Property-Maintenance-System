import { Invoice, Property, Ticket, TicketCreatePayload, Technician, Tenant, Unit } from "./types";

const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || response.statusText);
  }
  return response.json();
}

export const fetchTickets = (status?: string) =>
  request<Ticket[]>(`/tickets${status ? `?status=${encodeURIComponent(status)}` : ""}`);

export const fetchTicket = (ticketId: number) => request<Ticket>(`/tickets/${ticketId}`);

export const fetchInvoiceByTicket = (ticketId: number) =>
  request<Invoice>(`/tickets/${ticketId}/invoice`);

export const fetchProperties = () => request<Property[]>("/properties");

export const fetchTechnicians = () => request<Technician[]>("/technicians");

export const fetchUnits = () => request<Unit[]>("/units");

export const fetchTenants = () => request<Tenant[]>("/tenants");

export const createTicket = (payload: TicketCreatePayload) =>
  request<Ticket>("/tickets", { method: "POST", body: JSON.stringify(payload) });

export const assignTicket = (ticketId: number, technicianId: number) =>
  request<Ticket>(`/tickets/${ticketId}/assign`, {
    method: "PATCH",
    body: JSON.stringify({ technician_id: technicianId }),
  });

export const startTicket = (ticketId: number) =>
  request<Ticket>(`/tickets/${ticketId}/start`, { method: "PATCH" });

export const resolveTicket = (ticketId: number) =>
  request<Ticket>(`/tickets/${ticketId}/resolve`, { method: "PATCH" });

export const closeTicket = (ticketId: number) =>
  request<Ticket>(`/tickets/${ticketId}/close`, { method: "PATCH" });

export const createInvoice = (ticketId: number, amount: number) =>
  request<Invoice>(`/tickets/${ticketId}/invoice`, {
    method: "POST",
    body: JSON.stringify({ amount }),
  });

export const payInvoice = (invoiceId: number) =>
  request<Invoice>(`/invoices/${invoiceId}/pay`, { method: "PATCH" });

export const autoAssignTicket = (ticketId: number) =>
  request<Ticket>(`/tickets/${ticketId}/auto-assign`, { method: "PATCH" });
