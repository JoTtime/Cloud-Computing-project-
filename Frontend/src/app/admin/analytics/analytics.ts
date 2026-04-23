import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, RegistrationData, SpecialtyData, PatientStatusData, CumulativeData } from '../../services/admin.service';

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './analytics.html',
  styleUrls: ['./analytics.css']
})
export class AdminAnalytics implements OnInit, AfterViewInit, OnDestroy {
  loading = false;
  error = '';
  selectedPeriod: 'daily' | 'monthly' | 'yearly' = 'monthly';

  // 4 stat cards – will be updated from API
  statCards = [
    { label: 'TOTAL PATIENTS', value: 0, changeText: '+0%', footer: 'lifetime' },
    { label: 'TOTAL DOCTORS', value: 0, changeText: '+0%', footer: 'lifetime' },
    { label: 'ALL-TIME PATIENTS', value: 0, changeText: '', footer: 'total registered' },
    { label: 'PEAK PERIOD', value: '', changeText: '', footer: 'highest activity' }
  ];

  // Data objects
  registrationsData: RegistrationData = { labels: [], patients: [], doctors: [] };
  specialtyData: SpecialtyData = { labels: [], counts: [] };
  patientStatusData: PatientStatusData = { labels: [], counts: [] };
  cumulativeData: CumulativeData = { labels: [], values: [] };

  private tooltipDiv: HTMLElement | null = null;
  private hoverListener: ((e: MouseEvent) => void) | null = null;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadAllData();
  }

  ngAfterViewInit(): void {
    this.setupTooltip();
  }

  ngOnDestroy(): void {
    if (this.hoverListener) document.removeEventListener('mousemove', this.hoverListener);
    if (this.tooltipDiv) this.tooltipDiv.remove();
  }

  setPeriod(period: 'daily' | 'monthly' | 'yearly'): void {
    if (this.selectedPeriod === period) return;
    this.selectedPeriod = period;
    this.loadAllData(); // reload everything with new period
  }

  loadAllData(): void {
    this.loading = true;
    this.error = '';
    this.error = '';

    // Fetch all required data in parallel
    Promise.all([
      this.adminService.getRegistrations(this.selectedPeriod).toPromise(),
      this.adminService.getSpecialtyStats().toPromise(),
      this.adminService.getPatientStatus().toPromise(),
      this.adminService.getCumulativeGrowth(this.selectedPeriod).toPromise()
    ]).then(([regRes, specRes, statusRes, cumRes]) => {
      if (regRes?.success) {
        this.registrationsData = regRes.data;
        // Update stat cards using the registration total counts (if available)
        const totalPatients = this.registrationsData.patients.reduce((a,b) => a + b, 0);
        const totalDoctors = this.registrationsData.doctors.reduce((a,b) => a + b, 0);
        this.statCards[0].value = totalPatients;
        this.statCards[1].value = totalDoctors;
        // If the API provides all‑time patients separately, use it; otherwise use the cumulative last value
        // Here we assume the cumulative data's last value is the all‑time patients
        if (cumRes?.success && cumRes.data.values.length) {
          this.statCards[2].value = cumRes.data.values[cumRes.data.values.length - 1];
        }
        // Peak period could be derived from the registration data – for simplicity, we keep the API's own field
        // You could also compute the month with highest patient registration
        this.statCards[3].value = this.findPeakPeriod(); // custom helper using registrationsData
      }
      if (specRes?.success) this.specialtyData = specRes.data;
      if (statusRes?.success) this.patientStatusData = statusRes.data;
      if (cumRes?.success) this.cumulativeData = cumRes.data;

      this.loading = false;
      this.drawAllCharts();
    }).catch(err => {
      console.error(err);
      this.error = 'Failed to load analytics data. Please refresh.';
      this.loading = false;
    });
  }

  private findPeakPeriod(): string {
    // Find the label (month/year) with the highest patient registrations
    if (!this.registrationsData.labels.length) return 'N/A';
    const maxIndex = this.registrationsData.patients.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);
    return this.registrationsData.labels[maxIndex];
  }

  get selectedPeriodLabel(): string {
    return this.selectedPeriod === 'daily' ? 'Daily' : (this.selectedPeriod === 'monthly' ? 'Monthly' : 'Yearly');
  }

  private drawAllCharts(): void {
    this.drawRegistrationChart();
    this.drawSpecialtyChart();
    this.drawPatientStatusChart();
    this.drawCumulativeChart();
  }

  private getCanvas(id: string): HTMLCanvasElement | null {
    return document.getElementById(id) as HTMLCanvasElement;
  }

  // ---- Registration chart (bar chart) ----
  private drawRegistrationChart(): void {
    const canvas = this.getCanvas('registrationsChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.clientWidth;
    const h = 300;
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    const data = this.registrationsData;
    if (!data.labels.length) {
      ctx.fillStyle = '#6b8090';
      ctx.font = '14px "DM Sans"';
      ctx.fillText('No data available', w/2 - 60, h/2);
      return;
    }
    const maxVal = Math.max(...data.patients, ...data.doctors, 1);
    const barWidth = (w - 80) / data.labels.length - 6;
    const startX = 50;
    const yBase = h - 40;
    // axes
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(40, 20);
    ctx.lineTo(40, yBase);
    ctx.lineTo(w-20, yBase);
    ctx.stroke();
    // bars
    for (let i = 0; i < data.labels.length; i++) {
      const x = startX + i * (barWidth + 6);
      const patHeight = (data.patients[i] / maxVal) * (h - 70);
      const docHeight = (data.doctors[i] / maxVal) * (h - 70);
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(x, yBase - patHeight, barWidth/2 - 1, patHeight);
      ctx.fillStyle = '#0891b2';
      ctx.fillRect(x + barWidth/2, yBase - docHeight, barWidth/2 - 1, docHeight);
      // label
      ctx.fillStyle = '#6b8090';
      ctx.font = '10px "DM Sans"';
      const label = data.labels[i].length > 6 ? data.labels[i].substring(0,5)+'…' : data.labels[i];
      ctx.fillText(label, x + barWidth/4 - 8, yBase + 15);
    }
    // store for tooltip
    (canvas as any).regData = { data, maxVal, barWidth, startX, yBase, w, h };
  }

  private getRegistrationTooltip(mouseX: number, mouseY: number): string | null {
    const canvas = document.getElementById('registrationsChart') as any;
    if (!canvas || !canvas.regData) return null;
    const d = canvas.regData;
    for (let i = 0; i < d.data.labels.length; i++) {
      const x = d.startX + i * (d.barWidth + 6);
      const yBase = d.yBase;
      const patHeight = (d.data.patients[i] / d.maxVal) * (d.h - 70);
      const docHeight = (d.data.doctors[i] / d.maxVal) * (d.h - 70);
      if (mouseX > x && mouseX < x + d.barWidth/2 && mouseY > yBase - patHeight && mouseY < yBase) {
        return `${d.data.labels[i]}: ${d.data.patients[i]} patients`;
      }
      if (mouseX > x + d.barWidth/2 && mouseX < x + d.barWidth && mouseY > yBase - docHeight && mouseY < yBase) {
        return `${d.data.labels[i]}: ${d.data.doctors[i]} doctors`;
      }
    }
    return null;
  }

  // ---- Doctors by specialty (horizontal bar chart) ----
  private drawSpecialtyChart(): void {
    const canvas = this.getCanvas('specialtyChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.clientWidth;
    const h = 250;
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    const data = this.specialtyData;
    if (!data.labels.length) {
      ctx.fillStyle = '#6b8090';
      ctx.fillText('No data', w/2, h/2);
      return;
    }
    const maxCount = Math.max(...data.counts, 1);
    const barHeight = 25;
    const startY = 40;
    ctx.font = '12px "DM Sans"';
    for (let i = 0; i < data.labels.length; i++) {
      const y = startY + i * (barHeight + 8);
      const barWidth = (data.counts[i] / maxCount) * (w - 160);
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(60, y, barWidth, barHeight);
      ctx.fillStyle = '#0c1c2e';
      ctx.fillText(`${data.labels[i]} (${data.counts[i]})`, 10, y + 18);
    }
    // store for tooltip
    (canvas as any).specData = { data, maxCount, barHeight, startY, w };
  }

  private getSpecialtyTooltip(mouseX: number, mouseY: number): string | null {
    const canvas = document.getElementById('specialtyChart') as any;
    if (!canvas || !canvas.specData) return null;
    const d = canvas.specData;
    for (let i = 0; i < d.data.labels.length; i++) {
      const y = d.startY + i * (d.barHeight + 8);
      const barWidth = (d.data.counts[i] / d.maxCount) * (d.w - 160);
      if (mouseX > 10 && mouseX < 10 + barWidth && mouseY > y && mouseY < y + d.barHeight) {
        return `${d.data.labels[i]}: ${d.data.counts[i]} doctors`;
      }
    }
    return null;
  }

  // ---- Patient status (pie chart) ----
  private drawPatientStatusChart(): void {
    const canvas = this.getCanvas('patientStatusChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.clientWidth;
    const h = 250;
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    const data = this.patientStatusData;
    if (!data.labels.length) {
      ctx.fillStyle = '#6b8090';
      ctx.fillText('No data', w/2, h/2);
      return;
    }
    const total = data.counts.reduce((a,b)=>a+b,0);
    const colors = ['#0369a1', '#f59e0b', '#6b8090'];
    let startAngle = -Math.PI/2;
    const centerX = w/2;
    const centerY = h/2;
    const radius = 80;
    const slices: any[] = [];
    for (let i=0; i<data.labels.length; i++) {
      const angle = (data.counts[i]/total) * 2 * Math.PI;
      slices.push({ start: startAngle, end: startAngle + angle, label: data.labels[i], count: data.counts[i] });
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle+angle);
      ctx.fill();
      startAngle += angle;
    }
    // Legend
    ctx.font = '12px "DM Sans"';
    let legendY = 20;
    for (let i=0; i<data.labels.length; i++) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(w-100, legendY, 12, 12);
      ctx.fillStyle = '#0c1c2e';
      ctx.fillText(`${data.labels[i]}: ${data.counts[i]}`, w-85, legendY+10);
      legendY += 20;
    }
    // store slices for tooltip
    (canvas as any).pieSlices = slices;
    (canvas as any).pieCenter = { x: centerX, y: centerY };
    (canvas as any).pieRadius = radius;
  }

  private getPatientStatusTooltip(mouseX: number, mouseY: number, canvasW: number, canvasH: number): string | null {
    const canvas = document.getElementById('patientStatusChart') as any;
    if (!canvas || !canvas.pieSlices) return null;
    const center = canvas.pieCenter;
    const radius = canvas.pieRadius;
    const dx = mouseX - center.x;
    const dy = mouseY - center.y;
    const distance = Math.sqrt(dx*dx + dy*dy);
    if (distance > radius) return null;
    let angle = Math.atan2(dy, dx);
    if (angle < 0) angle += 2 * Math.PI;
    // Offset because startAngle = -PI/2
    let adjAngle = angle + Math.PI/2;
    if (adjAngle < 0) adjAngle += 2 * Math.PI;
    for (const slice of canvas.pieSlices) {
      if (adjAngle >= slice.start && adjAngle <= slice.end) {
        return `${slice.label}: ${slice.count} patients`;
      }
    }
    return null;
  }

  // ---- Cumulative growth line chart ----
  private drawCumulativeChart(): void {
    const canvas = this.getCanvas('cumulativeChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.clientWidth;
    const h = 300;
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    const data = this.cumulativeData;
    if (!data.labels.length) {
      ctx.fillStyle = '#6b8090';
      ctx.fillText('No data', w/2, h/2);
      return;
    }
    const maxVal = Math.max(...data.values, 1);
    const stepX = (w - 80) / (data.labels.length - 1);
    const yBase = h - 40;
    // axes
    ctx.beginPath();
    ctx.moveTo(40, yBase);
    ctx.lineTo(w-20, yBase);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(40, 20);
    ctx.lineTo(40, yBase);
    ctx.stroke();
    // line
    const points: Array<{x:number, y:number, label:string, value:number}> = [];
    ctx.beginPath();
    ctx.strokeStyle = '#0369a1';
    ctx.lineWidth = 2;
    for (let i=0; i<data.labels.length; i++) {
      const x = 40 + i * stepX;
      const y = yBase - (data.values[i]/maxVal)*(h-70);
      if (i===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
      ctx.fillStyle = '#0891b2';
      ctx.fillRect(x-2, y-2, 4,4);
      points.push({ x, y, label: data.labels[i], value: data.values[i] });
    }
    ctx.stroke();
    // store for tooltip
    (canvas as any).cumPoints = points;
    // labels
    ctx.fillStyle = '#6b8090';
    ctx.font = '10px "DM Sans"';
    for (let i=0; i<data.labels.length; i++) {
      const x = 40 + i * stepX;
      ctx.fillText(data.labels[i], x-12, yBase+12);
    }
  }

  private getCumulativeTooltip(mouseX: number, mouseY: number): string | null {
    const canvas = document.getElementById('cumulativeChart') as any;
    if (!canvas || !canvas.cumPoints) return null;
    for (const pt of canvas.cumPoints) {
      const dx = mouseX - pt.x;
      const dy = mouseY - pt.y;
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) {
        return `${pt.label}: ${pt.value} patients`;
      }
    }
    return null;
  }

  private setupTooltip(): void {
    this.tooltipDiv = document.createElement('div');
    this.tooltipDiv.className = 'tooltip';
    this.tooltipDiv.style.display = 'none';
    document.body.appendChild(this.tooltipDiv);
    this.hoverListener = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const canvas = target.closest('canvas');
      if (!canvas) {
        if (this.tooltipDiv) this.tooltipDiv.style.display = 'none';
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      let tooltipText: string | null = null;
      switch (canvas.id) {
        case 'registrationsChart':
          tooltipText = this.getRegistrationTooltip(mouseX, mouseY);
          break;
        case 'specialtyChart':
          tooltipText = this.getSpecialtyTooltip(mouseX, mouseY);
          break;
        case 'patientStatusChart':
          tooltipText = this.getPatientStatusTooltip(mouseX, mouseY, canvas.width, canvas.height);
          break;
        case 'cumulativeChart':
          tooltipText = this.getCumulativeTooltip(mouseX, mouseY);
          break;
      }
      if (tooltipText && this.tooltipDiv) {
        this.tooltipDiv.style.display = 'block';
        this.tooltipDiv.style.left = (e.clientX + 15) + 'px';
        this.tooltipDiv.style.top = (e.clientY - 20) + 'px';
        this.tooltipDiv.innerText = tooltipText;
      } else if (this.tooltipDiv) {
        this.tooltipDiv.style.display = 'none';
      }
    };
    document.addEventListener('mousemove', this.hoverListener);
  }
}