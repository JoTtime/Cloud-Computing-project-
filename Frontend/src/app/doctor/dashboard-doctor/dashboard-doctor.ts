import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from '../../services/appointment.service';
import { ConnectionService } from '../../services/connection';
import { NotificationService } from '../../services/notification';

@Component({
  selector: 'app-dashboard-doctor',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './dashboard-doctor.html',
  styleUrls: ['./dashboard-doctor.css']
})
export class DashboardDoctor implements OnInit {
  doctorName = 'Dr. Rivera';
  doctorInitials = 'DR';
  doctorRole = 'Admin';
  sidebarSearch = '';
  globalSearch = '';
  hasNotifications = true;
  pendingAppointments = 0;
  unreadMessages = 2;

  constructor(
    private router: Router,
    private appointmentService: AppointmentService,
    private connectionService: ConnectionService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadDoctorUser();
    this.loadPendingCounts();
  }

  loadDoctorUser(): void {
    const raw = localStorage.getItem('currentUser');
    if (raw) {
      try {
        const u = JSON.parse(raw);
        const first = u.firstName || '';
        const last = u.lastName || '';
        this.doctorName = `Dr. ${last || first}`;
        this.doctorInitials = `${(first[0] || '').toUpperCase()}${(last[0] || '').toUpperCase()}`;
        this.doctorRole = u.role || 'Doctor';
      } catch (e) {}
    }
  }

  loadPendingCounts(): void {
    this.appointmentService.getDoctorAppointments().subscribe({
      next: (res) => {
        this.pendingAppointments = (res.appointments || []).filter((a: any) => a.status === 'pending').length;
      }
    });
    // Also load unread messages count from message service if available
  }

  openNewAppointment(): void {
    this.router.navigate(['/doctor/schedule']);
  }

  toggleNotifications(): void {
    this.hasNotifications = false;
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}