import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ConnectionService } from '../../services/connection';
import { DoctorService, Doctor } from '../../services/doctor';

interface RecentDoctor {
  initials: string;
  name: string;
  specialty: string;
  online: boolean;
  avatarColor: string;
}

interface LatestPatient {
  initials: string;
  name: string;
  location: string;
  age: number;
  lastVisit: string;
  avatarColor: string;
}

@Component({
  selector: 'app-dashboard-admin-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard-admin-home.html',  
  styleUrls: ['./dashboard-admin-home.css']
})
export class DashboardAdminHome implements OnInit {
  loading = true;
  error = '';

  totalPatients = 0;
  totalDoctors = 0;
  doctorsOnDuty = 0;
  newPatientsThisWeek = 0;
  newDoctorsToday = 0;
  newPatientsToday = 0;          // added
  newToday = 0;
  platformHealth = 98;

  recentDoctors: RecentDoctor[] = [];
  latestPatients: LatestPatient[] = [];

  constructor(
    private router: Router,
    private connectionService: ConnectionService,
    private doctorService: DoctorService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      connections: this.connectionService.getDoctorConnections(),
      doctors: this.doctorService.getAllDoctors()
    }).subscribe({
      next: (results) => {
        // Process connections (patients)
        if (results.connections.success && results.connections.connections) {
          const accepted = results.connections.connections.filter((c: any) => c.status === 'accepted');
          this.totalPatients = accepted.length;

          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          this.newPatientsThisWeek = accepted.filter((c: any) => {
            if (!c.createdAt) return false;
            return new Date(c.createdAt) >= oneWeekAgo;
          }).length;

          const today = new Date();
          today.setHours(0,0,0,0);
          this.newPatientsToday = accepted.filter((c: any) => {
            if (!c.createdAt) return false;
            return new Date(c.createdAt) >= today;
          }).length;

          const sorted = [...accepted].sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });
          this.latestPatients = sorted.slice(0, 4).map((conn: any) => {
            const patient = conn.patient;
            const name = `${patient.firstName} ${patient.lastName}`;
            const initials = `${patient.firstName?.[0] || ''}${patient.lastName?.[0] || ''}`.toUpperCase();
            return {
              initials,
              name,
              location: patient.address?.city || patient.city || 'Not specified',
              age: this.calculateAge(patient.dateOfBirth),
              lastVisit: conn.updatedAt ? new Date(conn.updatedAt).toLocaleDateString() : 'N/A',
              avatarColor: '#0369a1'
            };
          });
        }

        // Process doctors
        if (results.doctors.success && results.doctors.doctors) {
          const docs = results.doctors.doctors;
          this.totalDoctors = docs.length;
          this.doctorsOnDuty = docs.filter(d => d.availableToday === true).length;
          // If doctors have a createdAt field, you could count new ones today;
          // otherwise leave as 0.
          this.newDoctorsToday = 0; // adjust if needed
          this.recentDoctors = docs.slice(0, 4).map((doc: Doctor) => ({
            initials: `${doc.firstName?.[0] || ''}${doc.lastName?.[0] || ''}`.toUpperCase(),
            name: `Dr. ${doc.firstName} ${doc.lastName}`,
            specialty: doc.specialty || 'General Medicine',
            online: doc.availableToday || false,
            avatarColor: '#0891b2'
          }));
        }

        this.newToday = this.newPatientsToday + this.newDoctorsToday;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load dashboard data. Please refresh.';
        this.loading = false;
      }
    });
  }

  private calculateAge(dateOfBirth?: string): number {
    if (!dateOfBirth) return 0;
    const birth = new Date(dateOfBirth);
    if (isNaN(birth.getTime())) return 0;
    const ageDiff = Date.now() - birth.getTime();
    const ageDate = new Date(ageDiff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  }

  openAnalytics(): void {
    this.router.navigate(['/admin/analytics']);
  }

  manageDoctors(): void {
    this.router.navigate(['/admin/doctors']);
  }

  managePatients(): void {
    this.router.navigate(['/admin/patients']);
  }
}