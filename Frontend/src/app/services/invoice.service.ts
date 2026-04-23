// invoice.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Invoice {
  _id?: string;
  number: string;
  patient: string;
  service: string;
  date: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
}

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private apiUrl = `${environment.apiUrl}/invoices`;

  constructor(private http: HttpClient) {}

  getMyInvoices(): Observable<{ success: boolean; invoices: Invoice[]; message?: string }> {
    return this.http.get<{ success: boolean; invoices: Invoice[] }>(this.apiUrl);
  }

  getRevenueByDateRange(start: Date, end: Date): Observable<{ success: boolean; data: { values: number[]; labels: string[] } }> {
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    return this.http.get<any>(`${this.apiUrl}/revenue?start=${startStr}&end=${endStr}`);
  }

  createInvoice(invoice: Partial<Invoice>): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean }>(this.apiUrl, invoice);
  }

  payOutstanding(): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/pay`, {});
  }
}