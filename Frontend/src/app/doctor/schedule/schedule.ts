import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AppointmentService, Appointment } from '../../services/appointment.service';
import { ConnectionService, Connection } from '../../services/connection';

interface AppointmentDisplay {
  time: string;
  patient: string;
  type: string;
  duration: string;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  mode: 'In-Person' | 'Teleconsult';
  appointmentId: string;
  patientId: string;
  date: Date;
  reason: string;
}

interface WeeklyStat {
  day: string;
  date: string;
  count: number;
  fullDate: Date;
}

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './schedule.html',
  styleUrls: ['./schedule.css']
})
export class Schedule implements OnInit {
  doctorName = '';
  currentDate: Date = new Date();
  selectedDate: Date = new Date();
  appointments: AppointmentDisplay[] = [];
  weeklyStats: WeeklyStat[] = [];
  todayTotal = 0;
  inPersonCount = 0;
  teleconsultCount = 0;
  isLoading = false;
  showNewApptModal = false;
  patientsList: { id: string; name: string }[] = [];

  newAppt = {
    patientId: '',
    date: '',
    time: '',
    mode: 'In-Person' as 'In-Person' | 'Teleconsult',
    reason: ''
  };

  constructor(
    private appointmentService: AppointmentService,
    private connectionService: ConnectionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDoctorInfo();
    this.loadAppointmentsForDate(this.selectedDate);
    this.generateWeeklyStats();
    this.loadPatientsList();
  }

  loadDoctorInfo(): void {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.doctorName = `Dr. ${user.firstName} ${user.lastName}`;
    }
  }

  loadPatientsList(): void {
    this.connectionService.getDoctorConnections().subscribe({
      next: (res) => {
        if (res.success && res.connections) {
          this.patientsList = res.connections
            .filter((c: Connection) => c.status === 'accepted')
            .map((c: Connection) => ({
              id: c.patient._id,
              name: `${c.patient.firstName} ${c.patient.lastName}`
            }));
        }
      }
    });
  }

  loadAppointmentsForDate(date: Date): void {
    this.isLoading = true;
    const dateStr = this.formatDateForAPI(date);
    this.appointmentService.getDoctorAppointments(undefined, dateStr).subscribe({
      next: (res) => {
        if (res.success && res.appointments) {
          this.appointments = this.transformAppointments(res.appointments);
          this.calculateStats();
        } else {
          this.appointments = [];
        }
        this.isLoading = false;
      },
      error: () => {
        this.appointments = [];
        this.isLoading = false;
      }
    });
  }

transformAppointments(appointments: Appointment[]): AppointmentDisplay[] {
  return appointments
    .filter(a => a.status === 'confirmed' || a.status === 'pending')
    .map(a => ({
      time: a.startTime,
      patient: typeof a.patient === 'object' ? `${a.patient.firstName} ${a.patient.lastName}` : 'Unknown Patient',
      type: a.reason || 'Consultation',
      duration: this.calcDuration(a.startTime, a.endTime),
      status: (a.status === 'confirmed' ? 'Confirmed' : 'Pending') as 'Confirmed' | 'Pending' | 'Cancelled',
      mode: (a.type === 'video' ? 'Teleconsult' : 'In-Person') as 'In-Person' | 'Teleconsult',
      appointmentId: a._id,
      patientId: typeof a.patient === 'object' ? a.patient._id : a.patient,
      date: new Date(a.date),
      reason: a.reason || 'Consultation'
    }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

  calcDuration(start: string, end: string): string {
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const diff = toMin(end) - toMin(start);
    return `${diff} min`;
  }

  calculateStats(): void {
    this.todayTotal = this.appointments.length;
    this.inPersonCount = this.appointments.filter(a => a.mode === 'In-Person').length;
    this.teleconsultCount = this.appointments.filter(a => a.mode === 'Teleconsult').length;
  }

  generateWeeklyStats(): void {
    const today = new Date(this.currentDate);
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    this.weeklyStats = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      this.weeklyStats.push({
        day: dayNames[i],
        date: this.formatDateShort(date),
        count: 0,
        fullDate: date
      });
    }
    this.loadWeeklyCounts();
  }

  loadWeeklyCounts(): void {
    this.weeklyStats.forEach((stat, idx) => {
      const dateStr = this.formatDateForAPI(stat.fullDate);
      this.appointmentService.getDoctorAppointments(undefined, dateStr).subscribe({
        next: (res) => {
          if (res.success && res.appointments) {
            this.weeklyStats[idx].count = res.appointments.filter(
              (a: Appointment) => a.status === 'confirmed' || a.status === 'pending'
            ).length;
          }
        }
      });
    });
  }

  previousDay(): void {
    this.selectedDate.setDate(this.selectedDate.getDate() - 1);
    this.selectedDate = new Date(this.selectedDate);
    this.loadAppointmentsForDate(this.selectedDate);
  }

  nextDay(): void {
    this.selectedDate.setDate(this.selectedDate.getDate() + 1);
    this.selectedDate = new Date(this.selectedDate);
    this.loadAppointmentsForDate(this.selectedDate);
  }

  goToToday(): void {
    this.selectedDate = new Date();
    this.loadAppointmentsForDate(this.selectedDate);
  }

  openNewAppointmentModal(): void {
    this.showNewApptModal = true;
    this.newAppt = { patientId: '', date: '', time: '', mode: 'In-Person', reason: '' };
  }

  closeNewAppointmentModal(): void {
    this.showNewApptModal = false;
  }

  createAppointment(): void {
    if (!this.newAppt.patientId || !this.newAppt.date || !this.newAppt.time) {
      alert('Please fill all required fields');
      return;
    }
    // Call appointment service to create
    // For now, just close and refresh
    this.closeNewAppointmentModal();
    this.loadAppointmentsForDate(this.selectedDate);
    alert('Appointment created (demo). Integrate with your backend.');
  }

  formatDateForAPI(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  formatDateShort(date: Date): string {
    return `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}`;
  }

  getFormattedCurrentDate(): string {
    return this.selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  getAppointmentCountText(): string {
    const c = this.appointments.length;
    return `${c} appointment${c !== 1 ? 's' : ''} scheduled`;
  }
}