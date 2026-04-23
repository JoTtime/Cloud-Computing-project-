import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

export interface Doctor {
  id: number;
  initials: string;
  name: string;
  specialty: string;
  rating: number;
  patients: number;
  available: boolean;
  cardGradient: string;
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
isDoctor: boolean = false;
  searchQuery = '';
  selectedSpecialty = 'All';

  specialties = [
    'All', 'Cardiology', 'General Practice', 'Pediatrics',
    'Neurology', 'Dermatology', 'Orthopedics', 'Oncology'
  ];

  allDoctors: Doctor[] = [
    { 
      id: 1, initials: 'ER', name: 'Dr. Elena Rivera', 
      specialty: 'Cardiology', rating: 4.9, patients: 142, available: true, 
      cardGradient: 'linear-gradient(135deg, #0369a1, #0891b2)',   // 🔵 changed to blue
      avatarGradient: 'linear-gradient(135deg, #0284c7, #0e7490)' 
    },
    { 
      id: 2, initials: 'AP', name: 'Dr. Aarav Patel', 
      specialty: 'General Practice', rating: 4.8, patients: 218, available: true, 
      cardGradient: 'linear-gradient(135deg, #0369a1, #0891b2)',   // 🔵 changed to blue
      avatarGradient: 'linear-gradient(135deg, #0284c7, #0e7490)' 
    },
    { 
      id: 3, initials: 'CO', name: 'Dr. Chiamaka Okafor', 
      specialty: 'Pediatrics', rating: 4.95, patients: 176, available: false, 
      cardGradient: 'linear-gradient(135deg, #f59e0b, #fcd34d)', 
      avatarGradient: 'linear-gradient(135deg, #d97706, #f59e0b)' 
    },
    { 
      id: 4, initials: 'HB', name: 'Dr. Henrik Berg', 
      specialty: 'Neurology', rating: 4.7, patients: 98, available: true, 
      cardGradient: 'linear-gradient(135deg, #a78bfa, #c4b5fd)', 
      avatarGradient: 'linear-gradient(135deg, #7c3aed, #a78bfa)' 
    },
    { 
      id: 5, initials: 'MT', name: 'Dr. Mei Tanaka', 
      specialty: 'Dermatology', rating: 4.85, patients: 203, available: true, 
      cardGradient: 'linear-gradient(135deg, #fb923c, #fca5a5)', 
      avatarGradient: 'linear-gradient(135deg, #ea580c, #fb923c)' 
    },
    { 
      id: 6, initials: 'SA', name: 'Dr. Samuel Adeyemi', 
      specialty: 'Orthopedics', rating: 4.6, patients: 134, available: false, 
      cardGradient: 'linear-gradient(135deg, #2dd4bf, #99f6e4)', 
      avatarGradient: 'linear-gradient(135deg, #0d9488, #2dd4bf)' 
    },
    { 
      id: 7, initials: 'LK', name: 'Dr. Lena Kovač', 
      specialty: 'Cardiology', rating: 4.9, patients: 167, available: true, 
      cardGradient: 'linear-gradient(135deg, #38bdf8, #93c5fd)', 
      avatarGradient: 'linear-gradient(135deg, #0284c7, #38bdf8)' 
    },
    { 
      id: 8, initials: 'JN', name: 'Dr. James Nguyen', 
      specialty: 'Oncology', rating: 4.75, patients: 89, available: true, 
      cardGradient: 'linear-gradient(135deg, #f472b6, #f9a8d4)', 
      avatarGradient: 'linear-gradient(135deg, #db2777, #f472b6)' 
    },
    { 
      id: 9, initials: 'AM', name: 'Dr. Amara Mensah', 
      specialty: 'General Practice', rating: 4.8, patients: 251, available: false, 
      cardGradient: 'linear-gradient(135deg, #86efac, #bbf7d0)', 
      avatarGradient: 'linear-gradient(135deg, #16a34a, #4ade80)' 
    },
  ];

  filteredDoctors: Doctor[] = [];

  constructor(private router: Router) {}

  ngOnInit() {
    this.filteredDoctors = [...this.allDoctors];
    const user = localStorage.getItem('currentUser');
    if (user) {
      const userData = JSON.parse(user);
      this.isDoctor = userData.userType === 'doctor';
    }
  }

  filterDoctors() {
    const q = this.searchQuery.toLowerCase().trim();
    this.filteredDoctors = this.allDoctors.filter(d => {
      const matchSearch = !q || d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q);
      const matchSpec   = this.selectedSpecialty === 'All' || d.specialty === this.selectedSpecialty;
      return matchSearch && matchSpec;
    });
  }

  selectSpecialty(spec: string) {
    this.selectedSpecialty = spec;
    this.filterDoctors();
  }

  bookConsultation(doctor: Doctor) {
    this.router.navigate(['/appointment'], { queryParams: { doctorId: doctor.id } });
  }

  addDoctor() {
    this.router.navigate(['/doctor-onboarding']);
  }

  get availableCount() {
    return this.filteredDoctors.filter(d => d.available).length;
  }
}