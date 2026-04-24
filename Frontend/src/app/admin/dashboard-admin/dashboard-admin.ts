import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService, AdminUser, RegistrationStats, StatsPoint } from '../../services/admin.service';

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-admin.html',
  styleUrl: './dashboard-admin.css',
})
export class DashboardAdmin implements OnInit {
  userName = 'Admin';
  isLoading = false;
  selectedPeriod: 'week' | 'month' | 'year' = 'week';
  activeTab: 'overview' | 'patients' | 'doctors' | 'statistic' = 'overview';
  stats: RegistrationStats | null = null;
  allUsers: AdminUser[] = [];
  doctors: AdminUser[] = [];
  patients: AdminUser[] = [];
  selectedUser: AdminUser | null = null;

  constructor(private adminService: AdminService, private router: Router) {}

  ngOnInit(): void {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      const user = JSON.parse(stored);
      if (user.userType !== 'admin') {
        this.router.navigate(['/login']);
        return;
      }
      this.userName = `${user.firstName} ${user.lastName}`;
    } else {
      this.router.navigate(['/login']);
      return;
    }
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.adminService.getUsers().subscribe({
      next: (res) => {
        this.allUsers = (res.users || []).filter((u) => u.userType !== 'admin');
        this.doctors = this.allUsers.filter((u) => u.userType === 'doctor');
        this.patients = this.allUsers.filter((u) => u.userType === 'patient');
        this.loadStats();
      },
      error: () => {
        this.isLoading = false;
        alert('Failed to load users.');
      },
    });
  }

  loadStats(): void {
    this.adminService.getStatistics(this.selectedPeriod).subscribe({
      next: (res) => {
        this.stats = res.data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        alert('Failed to load statistics.');
      },
    });
  }

  setPeriod(period: 'week' | 'month' | 'year'): void {
    this.selectedPeriod = period;
    this.loadStats();
  }

  setTab(tab: 'overview' | 'patients' | 'doctors' | 'statistic'): void {
    this.activeTab = tab;
  }

  maxCount(series: StatsPoint[]): number {
    return Math.max(1, ...series.map((s) => s.count));
  }

  barHeight(count: number, max: number): number {
    return Math.round((count / max) * 100);
  }

  openProfile(user: AdminUser): void {
    this.adminService.getUserById(user.userId).subscribe({
      next: (res) => (this.selectedUser = res.user),
      error: () => alert('Failed to load user profile.'),
    });
  }

  closeProfile(): void {
    this.selectedUser = null;
  }

  approveDoctor(user: AdminUser): void {
    this.adminService.approveDoctor(user.userId).subscribe({
      next: () => {
        user.isVerified = true;
        if (this.stats) {
          this.stats.pendingDoctorApprovals = Math.max(0, this.stats.pendingDoctorApprovals - 1);
        }
        alert('Doctor approved successfully.');
      },
      error: () => alert('Failed to approve doctor.'),
    });
  }

  deleteUser(user: AdminUser): void {
    const ok = confirm(`Delete ${user.firstName} ${user.lastName}? This cannot be undone.`);
    if (!ok) return;
    this.adminService.deleteUser(user.userId).subscribe({
      next: () => {
        this.allUsers = this.allUsers.filter((u) => u.userId !== user.userId);
        this.doctors = this.doctors.filter((u) => u.userId !== user.userId);
        this.patients = this.patients.filter((u) => u.userId !== user.userId);
      },
      error: () => alert('Failed to delete user.'),
    });
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    localStorage.removeItem('userProfile');
    this.router.navigate(['/login']);
  }
}
