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

interface ActivityItem {
  title: string;
  sub: string;
  time: string;
  color: string;
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
  pendingLabReviews = 2;
  clinicScore = 86;
  totalTodaySlots = 0;
  todayAppointments: ScheduleItem[] = [];

  statCards: StatCard[] = [
    { label: 'PATIENTS',       value: '—', trend: '—', trendUp: true,  icon: 'patients',  iconColor: '#0369a1', iconBg: 'rgba(3,105,161,0.08)' },
    { label: 'APPOINTMENTS',   value: '—', trend: '—', trendUp: true,  icon: 'calendar',  iconColor: '#0891b2', iconBg: 'rgba(8,145,178,0.08)' },
    { label: 'ACTIVE DOCTORS', value: '—', trend: '—', trendUp: true,  icon: 'doctors',   iconColor: '#7c3aed', iconBg: 'rgba(124,58,237,0.08)' },
    { label: 'REVENUE',        value: '—', trend: '—', trendUp: false, icon: 'revenue',   iconColor: '#dc2626', iconBg: 'rgba(220,38,38,0.08)' },
  ];

  recentActivity: ActivityItem[] = [];

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
        this.doctorName = `Dr. ${last || first}`;
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
        this.processDoctorConnections(res.connections?.connections || []);
        this.buildStatCards(res);
        this.buildRecentActivity();
        this.loading = false;
      },
      error: () => {
        this.useMockData();
        this.loading = false;
      }
    });
  }

  processAppointments(appointments: Appointment[]): void {
    const todayStr = new Date().toDateString();
    const todayApts = appointments.filter(a => {
      const d = new Date((a as any).date);
      return d.toDateString() === todayStr &&
             (a as any).status !== 'cancelled' &&
             (a as any).status !== 'rejected';
    }).sort((a, b) => ((a as any).time || '').localeCompare((b as any).time || ''));

    this.totalTodaySlots = todayApts.length;
    this.todayAppointments = todayApts.slice(0, 5).map(a => {
      const specialty = (a as any).specialty || (a as any).type || 'Consultation';
      const colors = SPECIALTY_COLORS[specialty] ?? { bg: 'rgba(3,105,161,0.10)', color: '#0369a1' };
      return {
        id: (a as any).id || (a as any)._id || '',
        patientName: (a as any).patientName || 'Unknown Patient',
        doctor: `Dr. ${(a as any).doctorName || this.doctorName}`,
        time: (a as any).time || '—',
        specialty,
        tagBg: colors.bg,
        tagColor: colors.color,
        appointmentData: a,
      };
    });
  }

  processDoctorConnections(connections: any[]): void {
    const active = connections.filter(c => c.status === 'accepted').length;
    this.statCards[0].value = active;
    this.statCards[0].trend = `+${active} total`;
  }

  buildStatCards(res: any): void {
    const apts = res.appointments?.appointments || [];
    this.statCards[1].value = apts.length;
    this.statCards[1].trend = '+5.2% vs last week';
    this.statCards[2].value = 32;
    this.statCards[2].trend = '+2 vs last week';
    this.statCards[3].value = '$48.2k';
    this.statCards[3].trend = '-1.8% vs last week';
    this.statCards[3].trendUp = false;
  }

  buildRecentActivity(): void {
    this.recentActivity = [
      { title: 'New patient registered',     sub: 'Amelia Chen joined the clinic',      time: '2m ago',  color: '#0369a1' },
      { title: 'Invoice #INV-2041 paid',     sub: 'Marcus Hill • $240',                 time: '18m ago', color: '#16a34a' },
      { title: 'Appointment rescheduled',    sub: 'Sofia Reyes → Apr 24, 11:00',        time: '1h ago',  color: '#d97706' },
      { title: 'Lab results uploaded',       sub: 'Jonas Müller — Blood panel',         time: '3h ago',  color: '#7c3aed' },
    ];
  }

  useMockData(): void {
    const colors = (s: string) => SPECIALTY_COLORS[s] ?? { bg: 'rgba(3,105,161,0.10)', color: '#0369a1' };
    this.todayAppointments = [
      { id:'1', patientName:'Amelia Chen',  doctor:'Dr. Rivera', time:'09:30', specialty:'Cardiology',   ...colors('Cardiology') },
      { id:'2', patientName:'Marcus Hill',  doctor:'Dr. Patel',  time:'10:15', specialty:'General',      ...colors('General') },
      { id:'3', patientName:'Sofia Reyes',  doctor:'Dr. Okafor', time:'11:00', specialty:'Pediatrics',   ...colors('Pediatrics') },
    ].map(i => ({ ...i, tagBg: (i as any).bg, tagColor: (i as any).color }));
    this.totalTodaySlots = 12;
    this.statCards[0].value = '2,481'; this.statCards[0].trend = '+12.4% vs last week';
    this.statCards[1].value = '184';   this.statCards[1].trend = '+5.2% vs last week';
    this.statCards[2].value = '32';    this.statCards[2].trend = '+2 vs last week';
    this.statCards[3].value = '$48.2k';this.statCards[3].trend = '-1.8% vs last week'; this.statCards[3].trendUp = false;
    this.buildRecentActivity();
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