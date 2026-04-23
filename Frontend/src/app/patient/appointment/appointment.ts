import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AppointmentService, Appointment as AppointmentModel } from '../../services/appointment.service';
import { DoctorService, Doctor } from '../../services/doctor';

// Display interface for calendar
interface CalendarAppointment {
  id: string;
  patientName: string;
  time: string;
  specialty: string;
  type: 'In-person' | 'Video call';
  date: Date;
  specialtyColor?: string;
}

const SPECIALTY_COLORS: Record<string, string> = {
  'Cardiology': '#0369a1',
  'General Practice': '#0891b2',
  'Pediatrics': '#ea580c',
  'Neurology': '#7c3aed',
  'Orthopedics': '#0d9488',
  'Dermatology': '#f97316',
  'Oncology': '#db2777',
  'Consultation': '#6b8090'
};

@Component({
  selector: 'app-appointment',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './appointment.html',
  styleUrls: ['./appointment.css']
})
export class Appointment implements OnInit {
  currentDate = new Date();
  currentMonth: number;
  currentYear: number;
  weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  calendarDays: any[] = [];
  todayAppointments: CalendarAppointment[] = [];
  loading = false;

  showModal = false;
  newAppointment = {
    patientName: '',
    doctorId: '',
    date: '',
    time: '',
    type: 'In-person' as 'In-person' | 'Video call',
    reason: 'Consultation'
  };

  doctorsList: { id: string; name: string; specialty: string }[] = [];
  private allAppointments: CalendarAppointment[] = [];

  constructor(
    private router: Router,
    private appointmentService: AppointmentService,
    private doctorService: DoctorService
  ) {
    this.currentMonth = this.currentDate.getMonth();
    this.currentYear = this.currentDate.getFullYear();
  }

  ngOnInit(): void {
    this.loadAppointments();
    this.loadDoctorsList();
  }

  loadAppointments(): void {
    this.loading = true;
    this.appointmentService.getPatientAppointments().subscribe({
      next: (res) => {
        if (res.success && res.appointments) {
          this.allAppointments = this.transformAppointments(res.appointments);
          this.generateCalendar();
          this.loadTodayAppointments();
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load appointments', err);
        this.loading = false;
      }
    });
  }

  loadDoctorsList(): void {
    this.doctorService.getAllDoctors().subscribe({
      next: (res) => {
        if (res.success && res.doctors) {
          this.doctorsList = res.doctors.map(doc => ({
            id: doc._id,
            name: `Dr. ${doc.firstName} ${doc.lastName}`,
            specialty: doc.specialty || 'General Medicine'
          }));
        }
      },
      error: (err) => console.error('Failed to load doctors', err)
    });
  }

  private transformAppointments(appointments: AppointmentModel[]): CalendarAppointment[] {
    return appointments.map(apt => {
      let patientName = 'Unknown Patient';
      if (apt.patient && typeof apt.patient === 'object') {
        const p = apt.patient as any;
        patientName = `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Patient';
      }

      let specialty = 'Consultation';
      if (apt.doctor && typeof apt.doctor === 'object') {
        const d = apt.doctor as any;
        specialty = d.specialty || specialty;
      }
      const specialtyColor = SPECIALTY_COLORS[specialty] || '#6b8090';

      return {
        id: apt._id,
        patientName: patientName,
        time: apt.startTime,
        specialty: specialty,
        type: apt.type === 'in-person' ? 'In-person' : 'Video call',
        date: new Date(apt.date),
        specialtyColor: specialtyColor
      };
    });
  }

  get currentMonthName(): string {
    return this.currentDate.toLocaleString('default', { month: 'long' });
  }

  generateCalendar(): void {
    const firstDayOfMonth = new Date(this.currentYear, this.currentMonth, 1);
    const startDay = firstDayOfMonth.getDay();
    const adjustedStart = (startDay === 0 ? 6 : startDay - 1);
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();

    const calendar: any[] = [];
    const today = new Date();
    today.setHours(0,0,0,0);

    const prevMonthDays = new Date(this.currentYear, this.currentMonth, 0).getDate();
    for (let i = adjustedStart - 1; i >= 0; i--) {
      calendar.push({ date: prevMonthDays - i, otherMonth: true, isToday: false, appointments: [] });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(this.currentYear, this.currentMonth, d);
      const isToday = cellDate.toDateString() === today.toDateString();
      calendar.push({
        date: d,
        otherMonth: false,
        isToday: isToday,
        appointments: this.getAppointmentsForDate(cellDate)
      });
    }

    const remaining = 42 - calendar.length;
    for (let i = 1; i <= remaining; i++) {
      calendar.push({ date: i, otherMonth: true, isToday: false, appointments: [] });
    }

    this.calendarDays = calendar;
  }

  getAppointmentsForDate(date: Date): CalendarAppointment[] {
    return this.allAppointments.filter(apt =>
      apt.date.getDate() === date.getDate() &&
      apt.date.getMonth() === date.getMonth() &&
      apt.date.getFullYear() === date.getFullYear()
    );
  }

  loadTodayAppointments(): void {
    const today = new Date();
    today.setHours(0,0,0,0);
    this.todayAppointments = this.allAppointments.filter(apt =>
      apt.date.toDateString() === today.toDateString()
    ).sort((a,b) => a.time.localeCompare(b.time));
  }

  changeMonth(delta: number): void {
    let newMonth = this.currentMonth + delta;
    let newYear = this.currentYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    this.currentMonth = newMonth;
    this.currentYear = newYear;
    this.currentDate = new Date(newYear, newMonth, 1);
    this.generateCalendar();
  }

  openNewAppointmentModal(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.newAppointment = {
      patientName: '',
      doctorId: '',
      date: '',
      time: '',
      type: 'In-person',
      reason: 'Consultation'
    };
  }

 saveNewAppointment(): void {
  if (!this.newAppointment.patientName || !this.newAppointment.doctorId || !this.newAppointment.date || !this.newAppointment.time) {
    alert('Please fill all required fields');
    return;
  }

  const endTime = this.calculateEndTime(this.newAppointment.time);

  // Map display type to API type
  const apiType: 'in-person' | 'video' = this.newAppointment.type === 'In-person' ? 'in-person' : 'video';

  const appointmentData = {
    doctorId: this.newAppointment.doctorId,
    date: this.newAppointment.date,
    startTime: this.newAppointment.time,
    endTime: endTime,
    type: apiType,
    reason: this.newAppointment.reason,
    notes: ''
  };

  this.appointmentService.bookAppointment(appointmentData).subscribe({
    next: (res) => {
      if (res.success) {
        alert('Appointment booked successfully!');
        this.loadAppointments();
        this.closeModal();
      } else {
        alert(res.message || 'Failed to book appointment');
      }
    },
    error: (err) => {
      console.error(err);
      alert('Error booking appointment. Please try again.');
    }
  });
}

  private calculateEndTime(startTime: string): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    let endHours = hours + 1;
    let endMinutes = minutes;
    if (endHours >= 24) endHours -= 24;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  }

  viewAppointment(appointment: CalendarAppointment): void {
    // Optional: navigate to detail page
    this.router.navigate(['/patient/appointment', appointment.id]);
  }
}