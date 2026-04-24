import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { SharedHeader } from '../../features/shared-header/shared-header';
import { BillingService, Invoice } from '../../services/billing.service';

@Component({
  selector: 'app-billing-dashboard',
  standalone: true,
  imports: [CommonModule, SharedHeader],
  templateUrl: './billing-dashboard.html',
  styleUrl: './billing-dashboard.css'
})
export class BillingDashboard implements OnInit {
  userName = '';
  userType: 'patient' | 'doctor' = 'patient';
  invoices: Invoice[] = [];
  totalFcfa = 0;
  latestInvoiceDate = '';
  isLoading = false;
  payingInvoiceId: string | null = null;

  constructor(private billingService: BillingService) {}

  ngOnInit(): void {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.userName = `${user.firstName} ${user.lastName}`;
      this.userType = user.userType === 'doctor' ? 'doctor' : 'patient';
    }
    this.loadBilling();
  }

  loadBilling(): void {
    this.isLoading = true;
    this.billingService.getMyInvoices().subscribe({
      next: (response) => {
        this.invoices = response.invoices ?? [];
        this.totalFcfa = this.invoices.reduce((sum, invoice) => sum + (invoice.amount || 0), 0);
        this.latestInvoiceDate = this.invoices.length > 0
          ? new Date(this.invoices[0].issuedAt).toLocaleString()
          : '';
        this.isLoading = false;
      },
      error: () => {
        this.invoices = [];
        this.totalFcfa = 0;
        this.latestInvoiceDate = '';
        this.isLoading = false;
      }
    });
  }

  payInvoice(invoice: Invoice): void {
    if (this.payingInvoiceId || invoice.status === 'paid') {
      return;
    }

    this.payingInvoiceId = invoice._id;
    this.billingService.payInvoice(invoice._id).subscribe({
      next: (response) => {
        if (response.success) {
          this.invoices = this.invoices.map(item =>
            item._id === invoice._id
              ? { ...item, status: response.invoice?.status || 'paid' }
              : item
          );
        }
        this.payingInvoiceId = null;
      },
      error: () => {
        this.payingInvoiceId = null;
        alert('Payment failed. Please try again.');
      }
    });
  }
}
