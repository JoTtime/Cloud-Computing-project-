import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Invoice {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  patientName: string;
  doctorName: string;
  description: string;
  amount: number;
  tax: number;
  totalAmount: number;
  status: 'unpaid' | 'paid' | 'cancelled' | 'refunded';
  paymentMethod?: 'cash' | 'card' | 'insurance' | 'online';
  paidAt?: string;
  dueDate?: string;
  createdAt: string;
  notes?: string;
}

export interface BillingResponse {
  success: boolean;
  message?: string;
  invoice?: Invoice;
  invoices?: Invoice[];
  stats?: { totalEarned: number; pendingInvoices: number };
}

@Injectable({ providedIn: 'root' })
export class BillingService {
  private apiUrl = `${environment.apiUrl}/billing`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  createInvoice(data: {
    patientId: string;
    patientName: string;
    doctorName: string;
    appointmentId?: string;
    consultationType?: string;
    description: string;
    amount?: number;
    tax?: number;
    dueDate?: string;
    notes?: string;
  }): Observable<BillingResponse> {
    return this.http.post<BillingResponse>(`${this.apiUrl}/invoices`, data, { headers: this.getHeaders() });
  }

  getMyInvoices(status?: string): Observable<BillingResponse> {
    const url = status ? `${this.apiUrl}/invoices?status=${status}` : `${this.apiUrl}/invoices`;
    return this.http.get<BillingResponse>(url, { headers: this.getHeaders() });
  }

  getInvoiceById(id: string): Observable<BillingResponse> {
    return this.http.get<BillingResponse>(`${this.apiUrl}/invoices/${id}`, { headers: this.getHeaders() });
  }

  payInvoice(id: string, paymentMethod: string): Observable<BillingResponse> {
    return this.http.patch<BillingResponse>(`${this.apiUrl}/invoices/${id}/pay`, { paymentMethod }, { headers: this.getHeaders() });
  }

  cancelInvoice(id: string): Observable<BillingResponse> {
    return this.http.patch<BillingResponse>(`${this.apiUrl}/invoices/${id}/cancel`, {}, { headers: this.getHeaders() });
  }

  getPricingRules(): Observable<BillingResponse> {
    return this.http.get<BillingResponse>(`${this.apiUrl}/rules`, { headers: this.getHeaders() });
  }

  getStats(): Observable<BillingResponse> {
    return this.http.get<BillingResponse>(`${this.apiUrl}/stats`, { headers: this.getHeaders() });
  }
}