import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

interface Invoice {
  number: string;
  patient: string;
  service: string;
  date: string;
  amount: number;
  status: 'Paid' | 'Pending';
}

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './billing.html',
  styleUrls: ['./billing.css']
})
export class Billing implements OnInit, AfterViewInit {
  @ViewChild('revenueChart') chartCanvas!: ElementRef<HTMLCanvasElement>;
  private chart: any; // We'll draw manually without external libs

  recentInvoices: Invoice[] = [];
  showCreateModal = false;
  showPaymentModal = false;

  selectedPeriod = 7;
  totalRevenue = 48290;
  revenueTrend = '+8.4% vs previous period';

  // Mock revenue data per day (last 90 days)
  private revenueData: { [key: number]: number[] } = {
    7:  [3200, 4100, 3800, 5200, 4800, 6100, 5900],
    30: [3200, 4100, 3800, 5200, 4800, 6100, 5900, 4300, 5100, 5600, 4900, 5300, 4700, 6200, 5800, 5400, 5100, 4900, 5500, 6000, 5700, 5300, 5900, 6200, 5800, 5400, 5600, 6100, 5900, 6300],
    90: [] // will generate dynamically
  };

  newInvoice = {
    patient: '',
    service: '',
    amount: 0,
    date: '',
    status: 'Pending' as 'Paid' | 'Pending'
  };

  ngOnInit(): void {
    this.loadMockInvoices();
    // Generate 90 days data
    this.revenueData[90] = Array.from({ length: 90 }, (_, i) => 3000 + Math.random() * 4000);
  }

  ngAfterViewInit(): void {
    this.drawChart();
  }

  loadMockInvoices(): void {
    this.recentInvoices = [
      { number: 'INV-2041', patient: 'Amelia Chen', service: 'Cardiology consult', date: 'Apr 18', amount: 240, status: 'Paid' },
      { number: 'INV-2042', patient: 'Marcus Hill', service: 'Orthopedics follow-up', date: 'Apr 17', amount: 180, status: 'Paid' },
      { number: 'INV-2043', patient: 'Sofia Reyes', service: 'Pediatrics checkup', date: 'Apr 16', amount: 150, status: 'Pending' },
      { number: 'INV-2044', patient: 'Liam O.', service: 'General consultation', date: 'Apr 15', amount: 200, status: 'Paid' },
      { number: 'INV-2045', patient: 'Priya Sin.', service: 'Neurology consult', date: 'Apr 14', amount: 320, status: 'Pending' },
    ];
  }

  setPeriod(days: number): void {
    this.selectedPeriod = days;
    this.totalRevenue = this.revenueData[days].reduce((a,b) => a+b, 0);
    this.revenueTrend = days === 7 ? '+8.4% vs previous week' : (days === 30 ? '+5.2% vs previous month' : '+12.1% vs previous quarter');
    this.drawChart();
  }

  drawChart(): void {
    const canvas = document.getElementById('revenueChart') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = this.revenueData[this.selectedPeriod];
    const width = canvas.clientWidth;
    const height = 180;
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);
    if (!data || data.length === 0) return;

    const maxRevenue = Math.max(...data, 10000);
    const barWidth = (width - 60) / data.length - 4;
    const startX = 40;

    // Draw y-axis labels
    ctx.font = '10px "DM Sans"';
    ctx.fillStyle = '#6b8090';
    for (let i = 0; i <= 4; i++) {
      const val = (maxRevenue / 4) * i;
      const y = height - 20 - (i * (height - 40) / 4);
      ctx.fillText(`$${Math.round(val/1000)}k`, 5, y);
      ctx.beginPath();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.5;
      ctx.moveTo(30, y);
      ctx.lineTo(width - 10, y);
      ctx.stroke();
    }

    // Draw bars
    for (let i = 0; i < data.length; i++) {
      const barHeight = (data[i] / maxRevenue) * (height - 40);
      const x = startX + i * (barWidth + 4);
      const y = height - 20 - barHeight;
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(x, y, barWidth, barHeight);
      // Optionally add value on top
      if (data[i] > 1000) {
        ctx.fillStyle = '#0c1c2e';
        ctx.font = '9px "DM Sans"';
        ctx.fillText(`$${Math.round(data[i]/1000)}k`, x + 2, y - 2);
      }
    }

    // Draw x-axis labels (show every Nth label)
    ctx.fillStyle = '#6b8090';
    ctx.font = '9px "DM Sans"';
    const step = Math.max(1, Math.floor(data.length / 10));
    for (let i = 0; i < data.length; i += step) {
      const x = startX + i * (barWidth + 4) + barWidth/2;
      const label = this.selectedPeriod === 7 ? ['Apr 11','12','13','14','15','16','17'][i] : 
                   (this.selectedPeriod === 30 ? `Day ${i+1}` : `D${i+1}`);
      ctx.fillText(label, x - 10, height - 8);
    }
  }

  exportToCSV(): void {
    const headers = ['Invoice Number', 'Patient', 'Service', 'Date', 'Amount ($)', 'Status'];
    const rows = this.recentInvoices.map(inv => [
      inv.number,
      inv.patient,
      inv.service,
      inv.date,
      inv.amount.toString(),
      inv.status
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Modal methods (same as before)
  openCreateInvoiceModal(): void { this.showCreateModal = true; }
  closeCreateModal(): void { this.showCreateModal = false; this.resetNewInvoice(); }
  resetNewInvoice(): void { this.newInvoice = { patient: '', service: '', amount: 0, date: '', status: 'Pending' }; }
  saveNewInvoice(): void {
    if (!this.newInvoice.patient || !this.newInvoice.service || !this.newInvoice.amount || !this.newInvoice.date) {
      alert('Please fill all fields');
      return;
    }
    const newId = `INV-${2000 + this.recentInvoices.length + 1}`;
    const newInv: Invoice = {
      number: newId,
      patient: this.newInvoice.patient,
      service: this.newInvoice.service,
      date: new Date(this.newInvoice.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      amount: this.newInvoice.amount,
      status: this.newInvoice.status
    };
    this.recentInvoices.unshift(newInv);
    this.closeCreateModal();
    alert('Invoice created successfully!');
  }
  openPaymentModal(): void { this.showPaymentModal = true; }
  closePaymentModal(): void { this.showPaymentModal = false; }
  processPayment(): void { alert('Payment processed successfully!'); this.closePaymentModal(); }
}