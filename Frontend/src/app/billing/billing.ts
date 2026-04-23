import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SharedHeader } from '../features/shared-header/shared-header';
import { BillingService, Invoice } from '../services/billing.service';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SharedHeader],
  templateUrl: './billing.html',
  styleUrl: './billing.css',
})
export class Billing implements OnInit {
  userName: string = '';
  userType: 'patient' | 'doctor' = 'patient';
  invoices: Invoice[] = [];
  filteredInvoices: Invoice[] = [];
  loading = true;
  selectedStatus: string = '';
  stats = { totalEarned: 0, pendingInvoices: 0 };

  // Pay modal
  showPayModal = false;
  selectedInvoice: Invoice | null = null;
  paymentMethod: string = 'card';
  paying = false;

  constructor(private billingService: BillingService) {}

  ngOnInit(): void {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      const user = JSON.parse(stored);
      this.userName = `${user.firstName} ${user.lastName}`;
      this.userType = user.userType;
    }
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.loading = true;
    this.billingService.getMyInvoices(this.selectedStatus || undefined).subscribe({
      next: (res) => {
        this.invoices = res.invoices || [];
        this.filteredInvoices = this.invoices;
        this.loading = false;
        this.computeStats();
      },
      error: () => { this.loading = false; }
    });
  }

  computeStats(): void {
    this.stats.totalEarned = this.invoices
      .filter(i => i.status === 'paid')
      .reduce((s, i) => s + i.totalAmount, 0);
    this.stats.pendingInvoices = this.invoices.filter(i => i.status === 'unpaid').length;
  }

  filterByStatus(status: string): void {
    this.selectedStatus = status;
    this.loadInvoices();
  }

  openPayModal(inv: Invoice): void {
    this.selectedInvoice = inv;
    this.paymentMethod = 'card';
    this.showPayModal = true;
  }

  closePayModal(): void {
    this.showPayModal = false;
    this.selectedInvoice = null;
  }

  confirmPayment(): void {
    if (!this.selectedInvoice) return;
    this.paying = true;
    this.billingService.payInvoice(this.selectedInvoice.id, this.paymentMethod).subscribe({
      next: () => {
        this.paying = false;
        this.closePayModal();
        this.loadInvoices();
      },
      error: () => { this.paying = false; }
    });
  }

  getStatusClass(status: string): string {
    return status;
  }
}
