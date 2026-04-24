import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  appointmentId: string;
  doctorId: string;
  patientId: string;
  amount: number;
  currency: string;
  status: string;
  issuedAt: string;
}

export interface BillingResponse {
  success: boolean;
  message?: string;
  invoice?: Invoice;
  invoices?: Invoice[];
}

@Injectable({ providedIn: 'root' })
export class BillingService {
  private apiUrl = `${environment.billingApiUrl}/billing`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    });
  }

  generateInvoice(appointmentId: string): Observable<BillingResponse> {
    return this.http.post<BillingResponse>(
      `${this.apiUrl}/invoices/generate`,
      { appointmentId },
      { headers: this.getHeaders() }
    );
  }

  getMyInvoices(): Observable<BillingResponse> {
    return this.http.get<BillingResponse>(
      `${this.apiUrl}/invoices/my`,
      { headers: this.getHeaders() }
    );
  }

  payInvoice(invoiceId: string): Observable<BillingResponse> {
    return this.http.post<BillingResponse>(
      `${this.apiUrl}/invoices/${invoiceId}/pay`,
      {},
      { headers: this.getHeaders() }
    );
  }
}
