import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BillingService, Invoice } from '../../services/billing.service';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './billing.html',
  styleUrls: ['./billing.css']
})
export class Billing implements OnInit {
  userType: 'patient' | 'doctor' = 'patient';
  invoices: Invoice[] = [];
  filteredInvoices: Invoice[] = [];
  loading = true;
  selectedStatus = '';

  stats = { totalPaid: 0, pendingCount: 0 };

  showPayModal = false;
  selectedInvoice: Invoice | null = null;
  paymentMethod = 'card';
  paying = false;

  constructor(private billingService: BillingService) {}

  ngOnInit(): void {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      const user = JSON.parse(stored);
      this.userType = user.userType;
    }
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.loading = true;
    const status = this.selectedStatus === '' ? undefined : this.selectedStatus;
    this.billingService.getMyInvoices(status).subscribe({
      next: (res) => {
        if (res.success && res.invoices) {
          this.invoices = res.invoices;
          this.applyFilter();
          this.computeStats();
        }
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  computeStats(): void {
    this.stats.totalPaid = this.invoices
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + i.totalAmount, 0);
    this.stats.pendingCount = this.invoices.filter(i => i.status === 'unpaid').length;
  }

  applyFilter(): void {
    if (!this.selectedStatus) {
      this.filteredInvoices = [...this.invoices];
    } else {
      this.filteredInvoices = this.invoices.filter(i => i.status === this.selectedStatus);
    }
  }

  filterByStatus(status: string): void {
    this.selectedStatus = status;
    this.applyFilter();
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
      error: (err) => {
        console.error(err);
        this.paying = false;
      }
    });
  }
}