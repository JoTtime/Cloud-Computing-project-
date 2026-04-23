import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DoctorService, Doctor } from '../../services/doctor';

interface DoctorDisplay {
  id: string;
  initials: string;
  name: string;
  specialty: string;
  rating: number;
  patients: number;
  available: boolean;
  avatarGradient: string;
}

@Component({
  selector: 'app-find-doctors',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './find-doctors.html',
  styleUrls: ['./find-doctors.css']
})
export class FindDoctorsComponent implements OnInit {
  isDoctor = false;
  searchQuery = '';
  selectedSpecialty = 'All';
  loading = false;

  specialties: string[] = ['All'];
  allDoctors: DoctorDisplay[] = [];
  filteredDoctors: DoctorDisplay[] = [];

  // Pagination
  currentPage = 1;
  pageSize = 10;

  private readonly avatarGradients = [
    'linear-gradient(135deg, #0369a1, #0891b2)',
    'linear-gradient(135deg, #0d9488, #059669)',
    'linear-gradient(135deg, #7c3aed, #6d28d9)',
    'linear-gradient(135deg, #db2777, #be185d)',
    'linear-gradient(135deg, #d97706, #b45309)',
    'linear-gradient(135deg, #dc2626, #b91c1c)',
    'linear-gradient(135deg, #0891b2, #0e7490)',
    'linear-gradient(135deg, #059669, #047857)',
  ];

  constructor(
    private router: Router,
    private doctorService: DoctorService
  ) {}

  ngOnInit(): void {
    this.loadDoctors();
    this.checkUserRole();
  }

  private checkUserRole(): void {
    const user = localStorage.getItem('currentUser');
    if (user) {
      const userData = JSON.parse(user);
      this.isDoctor = userData.userType === 'doctor';
    }
  }

  loadDoctors(): void {
    this.loading = true;
    this.doctorService.getAllDoctors().subscribe({
      next: (response) => {
        if (response.success && response.doctors) {
          this.allDoctors = response.doctors.map((doc, i) => this.mapDoctorToDisplay(doc, i));
          this.filteredDoctors = [...this.allDoctors];
          this.extractSpecialties();
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load doctors', err);
        this.loading = false;
      }
    });
  }

  private mapDoctorToDisplay(doc: Doctor, index: number): DoctorDisplay {
    const initials = ((doc.firstName?.[0] || '') + (doc.lastName?.[0] || '')).toUpperCase();
    return {
      id: doc._id,
      initials,
      name: `Dr. ${doc.firstName} ${doc.lastName}`,
      specialty: doc.specialty || 'General Medicine',
      rating: doc.rating || 0,
      patients: 0,
      available: doc.availableToday || false,
      avatarGradient: this.avatarGradients[index % this.avatarGradients.length]
    };
  }

  private extractSpecialties(): void {
    const unique = new Set(this.allDoctors.map(d => d.specialty));
    this.specialties = ['All', ...Array.from(unique).sort()];
  }

  // Called by search input
  onSearch(): void {
    this.currentPage = 1;
    this.filterDoctors();
  }

  filterDoctors(): void {
    const q = this.searchQuery.toLowerCase().trim();
    this.filteredDoctors = this.allDoctors.filter(d => {
      const matchSearch = !q || d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q);
      const matchSpec = this.selectedSpecialty === 'All' || d.specialty === this.selectedSpecialty;
      return matchSearch && matchSpec;
    });
  }

  selectSpecialty(spec: string): void {
    this.selectedSpecialty = spec;
    this.currentPage = 1;
    this.filterDoctors();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  bookConsultation(doctor: DoctorDisplay): void {
    this.router.navigate(['/appointment'], { queryParams: { doctorId: doctor.id } });
  }

  addDoctor(): void {
    this.router.navigate(['/doctor-onboarding']);
  }

  // ── Computed ──────────────────────────────────────

  get availableCount(): number {
    return this.filteredDoctors.filter(d => d.available).length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredDoctors.length / this.pageSize));
  }

  get pagedDoctors(): DoctorDisplay[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredDoctors.slice(start, start + this.pageSize);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }
}