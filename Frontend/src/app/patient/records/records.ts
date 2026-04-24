import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedHeader } from '../../features/shared-header/shared-header';
import { PatientProfileService, VitalRecord } from '../../services/patient-profile';

@Component({
  selector: 'app-records',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedHeader],
  templateUrl: './records.html',
  styleUrl: './records.css',
})
export class Records implements OnInit{
  userName: string = '';
  loading: boolean = true;
  vitals: VitalRecord[] = [];
  newVital: VitalRecord = {
    recordedAt: '',
    bloodPressureMmHg: '',
    heartRateBpm: 0,
    temperatureCelsius: 0,
    heightCm: 0,
    weightKg: 0
  };
  csvError = '';
  showVitalsModal = false;

  constructor(
    private patientProfileService: PatientProfileService
  ) {}

  ngOnInit(): void {
    this.loadUserName();
    this.loadVitals();
  }

  private loadUserName(): void {
    const raw = localStorage.getItem('currentUser');
    if (!raw) return;
    try {
      const user = JSON.parse(raw);
      this.userName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    } catch {
      this.userName = '';
    }
  }

  loadVitals(): void {
    this.loading = true;
    this.patientProfileService.getMyProfile().subscribe({
      next: (response) => {
        if (!response.success || !response.patient) {
          this.vitals = [];
          this.loading = false;
          return;
        }
        this.vitals = [...(response.patient.vitals ?? [])].sort((a, b) =>
          new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
        );
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.vitals = [];
      }
    });
  }

  addVital(): void {
    if (!this.newVital.recordedAt || !this.newVital.bloodPressureMmHg) {
      alert('Please fill date and blood pressure.');
      return;
    }
    const updated = [this.sanitizeVital(this.newVital), ...this.vitals];
    this.saveVitals(updated, 'Vital record added.');
  }

  openVitalsModal(): void {
    this.showVitalsModal = true;
  }

  closeVitalsModal(): void {
    this.showVitalsModal = false;
    this.newVital = {
      recordedAt: '',
      bloodPressureMmHg: '',
      heartRateBpm: 0,
      temperatureCelsius: 0,
      heightCm: 0,
      weightKg: 0
    };
  }

  removeVital(index: number): void {
    const updated = this.vitals.filter((_, i) => i !== index);
    this.saveVitals(updated, 'Vital record removed.');
  }

  downloadTemplate(): void {
    const header = 'recordedAt,bloodPressureMmHg,heartRateBpm,temperatureCelsius,heightCm,weightKg\n';
    const sample = '2026-04-23,120/80,72,36.7,170,70\n';
    const blob = new Blob([header + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vitals_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  onTemplateImport(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = this.parseCsv(String(reader.result ?? ''));
        if (parsed.length === 0) {
          this.csvError = 'No valid rows found in file.';
          return;
        }
        this.csvError = '';
        const sanitized = parsed.map((row) => this.sanitizeVital(row));
        const updated = [...sanitized, ...this.vitals].sort((a, b) =>
          new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
        );
        this.saveVitals(updated, `${parsed.length} rows imported successfully.`);
      } catch (e) {
        this.csvError = 'Invalid template format. Please use the downloaded template.';
      }
    };
    reader.readAsText(file);
  }

  private parseCsv(csv: string): VitalRecord[] {
    const lines = csv.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];
    const rows = lines.slice(1);
    return rows.map(row => {
      const [recordedAt, bloodPressureMmHg, hr, temp, height, weight] = row.split(',').map(v => v.trim());
      return {
        recordedAt,
        bloodPressureMmHg,
        heartRateBpm: Number(hr),
        temperatureCelsius: Number(temp),
        heightCm: Number(height),
        weightKg: Number(weight)
      } as VitalRecord;
    });
  }

  private saveVitals(vitals: VitalRecord[], successMessage: string): void {
    this.patientProfileService.updateProfile({ vitals }).subscribe({
      next: (response) => {
        if (!response.success || !response.patient) {
          alert(response.message || 'Failed to save vitals. Please try again.');
          return;
        }
        this.vitals = [...(response.patient.vitals ?? [])].sort((a, b) =>
          new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
        );
        this.newVital = {
          recordedAt: '',
          bloodPressureMmHg: '',
          heartRateBpm: 0,
          temperatureCelsius: 0,
          heightCm: 0,
          weightKg: 0
        };
        this.showVitalsModal = false;
        alert(successMessage);
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || 'Failed to save vitals. Please try again.';
        alert(msg);
      }
    });
  }

  private sanitizeVital(v: VitalRecord): VitalRecord {
    const n = (x: number) => (Number.isFinite(x) ? x : 0);
    return {
      recordedAt: v.recordedAt,
      bloodPressureMmHg: (v.bloodPressureMmHg || '').trim(),
      heartRateBpm: n(v.heartRateBpm),
      temperatureCelsius: n(v.temperatureCelsius),
      heightCm: n(v.heightCm),
      weightKg: n(v.weightKg)
    };
  }
}
