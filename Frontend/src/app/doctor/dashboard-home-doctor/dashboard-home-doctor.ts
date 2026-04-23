import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AppointmentService, Appointment } from '../../services/appointment.service';
import { ConnectionService } from '../../services/connection';

interface StatCard {
  label: string;
  value: string | number;
  trend: string;
  trendUp: boolean;
  icon: string;
  iconColor: string;
  iconBg: string;
}

interface ScheduleItem {
  id: string;
  patientName: string;
  doctor: string;
  time: string;
  specialty: string;
  tagBg: string;
  tagColor: string;
  appointmentData?: Appointment;
}

const SPECIALTY_COLORS: Record<string, { bg: string; color: string }> = {
  'Cardiology':   { bg: 'rgba(3,105,161,0.10)',  color: '#0369a1' },
  'General':      { bg: 'rgba(8,145,178,0.10)',   color: '#0891b2' },
  'Pediatrics':   { bg: 'rgba(234,179,8,0.12)',   color: '#a16207' },
  'Follow-up':    { bg: 'rgba(147,51,234,0.10)',  color: '#7e22ce' },
  'Consultation': { bg: 'rgba(239,68,68,0.10)',   color: '#dc2626' },
  'Neurology':    { bg: 'rgba(16,185,129,0.10)',  color: '#047857' },
  'Dermatology':  { bg: 'rgba(249,115,22,0.10)',  color: '#c2410c' },
};

@Component({
  selector: 'app-dashboard-home-doctor',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './dashboard-home-doctor.html',
  styleUrls: ['./dashboard-home-doctor.css']
})
export class DashboardHomeDoctor implements OnInit {
  loading = true;
  today = new Date();
  doctorName = '';
  pendingLabReviews = 0;
  clinicScore = 86;   // could be fetched from a service
  totalTodaySlots = 0;
  todayAppointments: ScheduleItem[] = [];

  statCards: StatCard[] = [
    { label: 'PATIENTS',       value: 0, trend: 'Loading...', trendUp: true,  icon: 'patients',  iconColor: '#0369a1', iconBg: 'rgba(3,105,161,0.08)' },
    { label: 'APPOINTMENTS',   value: 0, trend: 'Loading...', trendUp: true,  icon: 'calendar',  iconColor: '#0891b2', iconBg: 'rgba(8,145,178,0.08)' },
    { label: 'ACTIVE DOCTORS', value: 0, trend: 'Loading...', trendUp: true,  icon: 'doctors',   iconColor: '#7c3aed', iconBg: 'rgba(124,58,237,0.08)' },
    { label: 'REVENUE',        value: 0, trend: 'Loading...', trendUp: false, icon: 'revenue',   iconColor: '#dc2626', iconBg: 'rgba(220,38,38,0.08)' },
  ];

  recentActivity: { title: string; sub: string; time: string; color: string }[] = [];

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  get ringDash(): string {
    const circ = 2 * Math.PI * 52;
    const filled = (this.clinicScore / 100) * circ;
    return `${filled} ${circ}`;
  }

  constructor(
    private router: Router,
    private appointmentService: AppointmentService,
    private connectionService: ConnectionService
  ) {}

  ngOnInit(): void {
    this.loadDoctorUser();
    this.loadDashboardData();
  }

  loadDoctorUser(): void {
    const raw = localStorage.getItem('currentUser');
    if (raw) {
      try {
        const u = JSON.parse(raw);
        const first = u.firstName || '';
        const last = u.lastName || '';
        this.doctorName = `Dr. ${first} ${last}`.trim();
      } catch (e) {}
    }
  }

  loadDashboardData(): void {
    this.loading = true;
    forkJoin({
      appointments: this.appointmentService.getDoctorAppointments(),
      connections:  this.connectionService.getDoctorConnections(),
    }).subscribe({
      next: (res) => {
        this.processAppointments(res.appointments?.appointments || []);
        this.processConnections(res.connections?.connections || []);
        this.updateStatCards();
        this.buildRecentActivity();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading dashboard data', err);
        // Set error states (no mock data)
        this.statCards.forEach(card => { card.value = 'Error'; card.trend = 'Failed to load'; });
        this.todayAppointments = [];
        this.recentActivity = [];
        this.loading = false;
      }
    });
  }

  processAppointments(appointments: Appointment[]): void {
    const todayStr = new Date().toDateString();
    const todayApts = appointments.filter(a => {
      const d = new Date(a.date);
      return d.toDateString() === todayStr &&
             a.status !== 'cancelled' &&
             a.status !== 'rejected';
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));

    this.totalTodaySlots = appointments.length; // total appointments as "total slots"
    this.todayAppointments = todayApts.slice(0, 5).map(a => {
      let patientName = 'Unknown';
      if (a.patient && typeof a.patient === 'object') {
        const p = a.patient as any;
        patientName = `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Patient';
      }
      const specialty = (a.doctor && typeof a.doctor === 'object') 
        ? (a.doctor as any).specialty || 'Consultation' 
        : 'Consultation';
      const colors = SPECIALTY_COLORS[specialty] ?? { bg: 'rgba(3,105,161,0.10)', color: '#0369a1' };
      return {
        id: a._id,
        patientName: patientName,
        doctor: (a.doctor && typeof a.doctor === 'object') ? `Dr. ${(a.doctor as any).firstName}` : 'Doctor',
        time: a.startTime,
        specialty: specialty,
        tagBg: colors.bg,
        tagColor: colors.color,
        appointmentData: a,
      };
    });
  }

  processConnections(connections: any[]): void {
    const accepted = connections.filter(c => c.status === 'accepted').length;
    const total = connections.length;
    this.statCards[0].value = total;
    this.statCards[0].trend = accepted > 0 ? `${accepted} active` : 'No active';
    this.statCards[2].value = accepted;
    this.statCards[2].trend = accepted > 0 ? `${accepted} connected` : 'No doctors';
  }

  updateStatCards(): void {
    // Revenue would come from a billing service – for now, keep it simple
    this.statCards[3].value = '$0';
    this.statCards[3].trend = 'No data';
  }

  buildRecentActivity(): void {
    // Build from real appointments (last 4, for example)
    const activities: { title: string; sub: string; time: string; color: string }[] = [];
    // Take the most recent appointments (from processAppointments, but we'd need sorted by date)
    // For simplicity, we'll show a placeholder – you can later fetch a real activity feed
    if (this.todayAppointments.length > 0) {
      const apt = this.todayAppointments[0];
      activities.push({
        title: 'Upcoming appointment',
        sub: `${apt.patientName} at ${apt.time}`,
        time: 'today',
        color: '#0369a1'
      });
    }
    if (activities.length === 0) {
      activities.push({ title: 'No recent activity', sub: 'Your schedule is clear', time: '', color: '#6b8090' });
    }
    this.recentActivity = activities;
  }

  viewTodaySchedule(): void {
    this.router.navigate(['/doctor/schedule']);
  }

  quickAddPatient(): void {
    this.router.navigate(['/doctor/patients']);
  }

  openAppointmentDetail(apt: ScheduleItem): void {
    if (apt.id) this.router.navigate(['/doctor/schedule'], { queryParams: { apt: apt.id } });
  }
}