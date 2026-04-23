import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

interface AppointmentData {
  id: string;
  patientName: string;
  time: string;
  specialty: string;
  type: 'In-person' | 'Video call';
  date: Date;
  specialtyColor?: string;
}

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
  todayAppointments: AppointmentData[] = [];

  showModal = false;
  newAppointment = {
    patientName: '',
    doctor: '',
    date: '',
    time: '',
    type: 'In-person' as 'In-person' | 'Video call'
  };

  // Map doctor names to specialty and color
  doctorSpecialtyMap: Record<string, { specialty: string; color: string }> = {
    'Dr. Elena Rivera': { specialty: 'Cardiology', color: '#0369a1' },
    'Dr. Aarav Patel': { specialty: 'General Practice', color: '#0891b2' },
    'Dr. Chiamaka Okafor': { specialty: 'Pediatrics', color: '#ea580c' },
    'Dr. Henrik Berg': { specialty: 'Neurology', color: '#7c3aed' }
  };

  allAppointments: AppointmentData[] = [
    { id: '1', patientName: 'Amelia Chen', time: '09:30', specialty: 'Cardiology', type: 'In-person', date: new Date(2026, 3, 23), specialtyColor: '#0369a1' },
    { id: '2', patientName: 'Marcus Hill', time: '10:15', specialty: 'Orthopedics', type: 'Video call', date: new Date(2026, 3, 23), specialtyColor: '#0891b2' },
    { id: '3', patientName: 'Sofia Reyes', time: '11:00', specialty: 'Pediatrics', type: 'In-person', date: new Date(2026, 3, 23), specialtyColor: '#ea580c' },
    { id: '4', patientName: 'Liam O.', time: '14:30', specialty: 'General', type: 'In-person', date: new Date(2026, 3, 24), specialtyColor: '#0891b2' },
    { id: '5', patientName: 'Priya Sin.', time: '09:00', specialty: 'Consultation', type: 'Video call', date: new Date(2026, 3, 25), specialtyColor: '#7c3aed' },
  ];

  constructor(private router: Router) {
    this.currentMonth = this.currentDate.getMonth();
    this.currentYear = this.currentDate.getFullYear();
  }

  ngOnInit(): void {
    this.generateCalendar();
    this.loadTodayAppointments();
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
      calendar.push({
        date: prevMonthDays - i,
        otherMonth: true,
        isToday: false,
        appointments: []
      });
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
      calendar.push({
        date: i,
        otherMonth: true,
        isToday: false,
        appointments: []
      });
    }

    this.calendarDays = calendar;
  }

  getAppointmentsForDate(date: Date): AppointmentData[] {
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
    // Reset form
    this.newAppointment = {
      patientName: '',
      doctor: '',
      date: '',
      time: '',
      type: 'In-person'
    };
  }

  saveNewAppointment(): void {
    if (!this.newAppointment.patientName || !this.newAppointment.doctor || !this.newAppointment.date || !this.newAppointment.time) {
      alert('Please fill all fields');
      return;
    }

    const selectedDoctor = this.doctorSpecialtyMap[this.newAppointment.doctor];
    if (!selectedDoctor) return;

    const appointmentDate = new Date(this.newAppointment.date);
    const newId = (this.allAppointments.length + 1).toString();

    const newApt: AppointmentData = {
      id: newId,
      patientName: this.newAppointment.patientName,
      time: this.newAppointment.time,
      specialty: selectedDoctor.specialty,
      type: this.newAppointment.type,
      date: appointmentDate,
      specialtyColor: selectedDoctor.color
    };

    this.allAppointments.push(newApt);
    this.generateCalendar();
    this.loadTodayAppointments();
    this.closeModal();
  }

  viewAppointment(appointment: AppointmentData): void {
    console.log('View appointment', appointment);
    // Optional: navigate to detail page
  }
}