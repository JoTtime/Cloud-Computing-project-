import { Component, OnDestroy, OnInit } from '@angular/core';
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
export class Billing implements OnInit, OnDestroy {
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
  phoneNumber = '';
  operator = '';
  paymentReference = '';
  private verifyTimer: ReturnType<typeof setInterval> | null = null;
  private verifyAttempts = 0;

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

  ngOnDestroy(): void {
    this.clearVerifyTimer();
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
    this.phoneNumber = '';
    this.operator = '';
    this.paymentReference = '';
    this.clearVerifyTimer();
    this.showPayModal = true;
  }

  closePayModal(): void {
    this.clearVerifyTimer();
    this.showPayModal = false;
    this.selectedInvoice = null;
  }

  confirmPayment(): void {
    if (!this.selectedInvoice) return;
    const isCampayFlow = this.paymentMethod === 'card' || this.paymentMethod === 'online';
    if (isCampayFlow) {
      if (!this.phoneNumber.trim()) {
        alert('Please enter the mobile money phone number.');
        return;
      }
      this.startCampayPayment();
      return;
    }

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

  private startCampayPayment(): void {
    if (!this.selectedInvoice) return;
    this.paying = true;
    this.billingService.initiateCampayPayment(this.selectedInvoice.id, {
      phoneNumber: this.phoneNumber.trim(),
      operator: this.operator.trim() || undefined
    }).subscribe({
      next: (res) => {
        this.paying = false;
        this.paymentReference = res.payment?.reference || '';
        alert(res.payment?.message || 'Payment initiated. Approve the prompt on your phone.');
        if (!this.paymentReference) {
          return;
        }
        this.startVerificationPolling();
      },
      error: (err) => {
        this.paying = false;
        alert(err.error?.message || 'Failed to initiate Campay payment.');
      }
    });
  }

  private startVerificationPolling(): void {
    this.clearVerifyTimer();
    this.verifyAttempts = 0;
    this.verifyTimer = setInterval(() => {
      if (!this.selectedInvoice || !this.paymentReference) {
        this.clearVerifyTimer();
        return;
      }
      this.verifyAttempts += 1;
      this.billingService.verifyCampayPayment(this.selectedInvoice.id, this.paymentReference).subscribe({
        next: (res) => {
          if (res.payment?.paid) {
            this.clearVerifyTimer();
            alert('Payment successful.');
            this.closePayModal();
            this.loadInvoices();
          } else if (this.verifyAttempts >= 12) {
            this.clearVerifyTimer();
            alert('Payment is still pending. You can verify again from Billing later.');
          }
        },
        error: () => {
          if (this.verifyAttempts >= 12) {
            this.clearVerifyTimer();
          }
        }
      });
    }, 5000);
  }

  private clearVerifyTimer(): void {
    if (this.verifyTimer) {
      clearInterval(this.verifyTimer);
      this.verifyTimer = null;
    }
  }

  getStatusClass(status: string): string {
    return status;
  }
}
